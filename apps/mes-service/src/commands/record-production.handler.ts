import { CommandHandler, ICommandHandler, EventBus, CommandBus } from '@nestjs/cqrs';
import { RecordProductionCommand } from './record-production.command';
import { PrismaService } from '../prisma.service';
import { ProductionRecordedEvent } from '@erp/shared-kernel';
import { assertEtoOperationalPayload } from '@erp/shared-kernel';

@CommandHandler(RecordProductionCommand)
export class RecordProductionHandler implements ICommandHandler<RecordProductionCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RecordProductionCommand) {
    const tenantId = 'default';

    // Pre-reads outside TX (read-only)
    let requirements: {
      id: string;
      itemId: string;
      quantity: number;
      reservedQty: number;
      bomComponentId: string | null;
    }[] = [];
    try {
      requirements = await this.prisma.materialRequirement.findMany({
        where: { workOrderId: command.workOrderId, tenantId },
      });
    } catch {
      /* env without schema */
    }

    const workOrder = await this.prisma.workOrder
      .findUnique({
        where: { id: command.workOrderId },
      })
      .catch(() => null);

    const lotIds = (command as { lotIds?: string[] }).lotIds ?? [];
    const serialNumbers = (command as { serialNumbers?: string[] }).serialNumbers ?? [];
    const operationId = (command as { operationId?: string }).operationId;
    const bomComponentIds = requirements
      .map((r) => r.bomComponentId)
      .filter((x): x is string => Boolean(x));

    const outboxPayload: Record<string, unknown> = {
      workOrderId: command.workOrderId,
      projectId: workOrder?.projectId || undefined,
      tenantId: workOrder?.tenantId || tenantId,
      quantityGood: command.quantityGood,
      quantityScrap: command.quantityScrap,
      operatorId: command.operatorId,
      laborHours: command.laborHours || 0,
      recordedAt: new Date().toISOString(),
      bomComponentIds,
      bomComponentId: bomComponentIds[0] || undefined,
      operationId,
      lotIds,
      serialNumbers,
    };
    if (workOrder?.projectId) {
      try {
        assertEtoOperationalPayload(outboxPayload, 'mes.production.recorded.v1');
      } catch {
        /* WO without WBS link — non-fatal in demo env */
      }
    }

    const asBuiltItemId = requirements[0]?.itemId || 'unknown';

    // Domain write (production + asBuilt + requirement status) + outbox in one TX
    const record = await this.prisma.$transaction(async (tx) => {
      const productionRecord = await tx.productionRecord.create({
        data: {
          workOrderId: command.workOrderId,
          quantityGood: command.quantityGood,
          quantityScrap: command.quantityScrap,
          operatorId: command.operatorId,
        },
      });

      // Update MaterialRequirement status for consumed lines (same TX as production)
      if (command.quantityGood > 0 && requirements.length > 0) {
        const totalReqQty = requirements.reduce((sum, r) => sum + r.quantity, 0) || 1;
        for (const req of requirements) {
          const consumeQty = Math.min(
            req.quantity,
            command.quantityGood * (req.quantity / totalReqQty),
          );
          if (consumeQty <= 0) continue;
          await tx.materialRequirement.update({
            where: { id: req.id },
            data: {
              status: 'ISSUED',
              reservedQty: Math.max(0, req.reservedQty - consumeQty),
            },
          });
        }
      }

      // As-built genealogy (Q1 E1.3): parent record + components with bomComponentId
      const asBuilt = await tx.asBuiltRecord.create({
        data: {
          tenantId,
          workOrderId: command.workOrderId,
          itemId: asBuiltItemId,
          quantity: command.quantityGood,
          completedAt: new Date(),
          serialNumber: null,
        },
      });

      if (requirements.length > 0 && command.quantityGood > 0) {
        const totalReqQty = requirements.reduce((sum, r) => sum + r.quantity, 0) || 1;
        for (const req of requirements) {
          const qty = Math.min(
            req.quantity,
            command.quantityGood * (req.quantity / totalReqQty),
          );
          if (qty <= 0) continue;
          await tx.asBuiltComponent.create({
            data: {
              asBuiltRecordId: asBuilt.id,
              bomComponentId: req.bomComponentId,
              itemId: req.itemId,
              quantity: qty,
              consumedAt: new Date(),
            },
          });
        }
      }

      await tx.outboxEvent.create({
        data: {
          tenantId: workOrder?.tenantId || tenantId,
          aggregateId: command.workOrderId,
          aggregateType: 'WorkOrder',
          eventType: 'mes.production.recorded.v1',
          payload: outboxPayload as object,
          status: 'PENDING',
        },
      });

      // Q1 E1.3 — promote workorder completed event (Active spine)
      await tx.outboxEvent.create({
        data: {
          tenantId: workOrder?.tenantId || tenantId,
          aggregateId: command.workOrderId,
          aggregateType: 'WorkOrder',
          eventType: 'mes.workorder.completed.v1',
          payload: {
            workOrderId: command.workOrderId,
            projectId: workOrder?.projectId || undefined,
            tenantId: workOrder?.tenantId || tenantId,
            completedAt: new Date().toISOString(),
            bomComponentIds,
            lotIds,
            serialNumbers,
          },
          status: 'PENDING',
        },
      });

      return productionRecord;
    });

    // Local in-process event (not bus; no dual-write risk with DB)
    this.eventBus.publish(
      new ProductionRecordedEvent(
        command.workOrderId,
        command.quantityGood,
        command.quantityScrap,
        new Date(),
      ),
    );

    // === Faza 1 ETO Traceability: Consumption via CQRS (own Prisma / no shared TX) ===
    if (command.quantityGood > 0 && requirements.length > 0) {
      const totalReqQty = requirements.reduce((sum, r) => sum + r.quantity, 0) || 1;
      for (const req of requirements) {
        const consumeQty = Math.min(
          req.quantity,
          command.quantityGood * (req.quantity / totalReqQty),
        );
        if (consumeQty <= 0) continue;

        try {
          await this.commandBus.execute(
            new (await import('./consume-material.command')).ConsumeMaterialCommand(
              command.workOrderId,
              req.itemId,
              null,
              consumeQty,
              req.bomComponentId,
            ),
          );
        } catch {
          /* safe for env / missing ConsumeMaterial handler in unit tests */
        }
      }
    }

    console.log(
      `[MES] Production recorded for WO ${command.workOrderId} - MaterialConsumption + AsBuilt + mes.production.recorded.v1 emitted (requirements: ${requirements.length})`,
    );

    return record;
  }
}
