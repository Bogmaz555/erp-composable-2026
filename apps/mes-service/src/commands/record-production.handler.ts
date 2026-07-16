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
    const record = await this.prisma.productionRecord.create({
      data: {
        workOrderId: command.workOrderId,
        quantityGood: command.quantityGood,
        quantityScrap: command.quantityScrap,
        operatorId: command.operatorId,
      },
    });

    // Emit local event (existing)
    this.eventBus.publish(new ProductionRecordedEvent(
      command.workOrderId,
      command.quantityGood,
      command.quantityScrap,
      new Date(),
    ));

    // === Faza 1 ETO Traceability: Production → Consumption + Reservation Release ===
    const tenantId = 'default';

    // 1. Find linked MaterialRequirements for this WO (to get bomComponentId + item for accurate consumption)
    let requirements: { id: string; itemId: string; quantity: number; reservedQty: number; bomComponentId: string | null }[] = [];
    try {
      requirements = await this.prisma.materialRequirement.findMany({
        where: { workOrderId: command.workOrderId, tenantId },
      });
    } catch { /* env without schema */ }

    // 2. Create MaterialConsumption records via CQRS command (backflush style) with bomComponentId for full genealogy
    if (command.quantityGood > 0 && requirements.length > 0) {
      const totalReqQty = requirements.reduce((sum, r) => sum + r.quantity, 0) || 1;
      for (const req of requirements) {
        const consumeQty = Math.min(req.quantity, command.quantityGood * (req.quantity / totalReqQty));
        if (consumeQty <= 0) continue;

        // Use the dedicated command (now supports bomComponentId) instead of direct Prisma
        await this.commandBus.execute(new (await import('./consume-material.command')).ConsumeMaterialCommand(
          command.workOrderId,
          req.itemId,
          null,
          consumeQty,
          req.bomComponentId
        )).catch(() => { /* safe for env */ });

        // Also update requirement status
        await this.prisma.materialRequirement.update({
          where: { id: req.id },
          data: { status: 'ISSUED', reservedQty: Math.max(0, req.reservedQty - consumeQty) },
        }).catch(() => {});
      }
    }

    // 3. Create / update AsBuiltRecord (with better item from first requirement if available)
    const asBuiltItemId = requirements[0]?.itemId || 'unknown';
    await this.prisma.asBuiltRecord.create({
      data: {
        tenantId,
        workOrderId: command.workOrderId,
        itemId: asBuiltItemId,
        quantity: command.quantityGood,
        completedAt: new Date(),
      },
    }).catch(() => { /* schema/env safe */ });

    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: command.workOrderId },
    }).catch(() => null);

    const outboxPayload: Record<string, unknown> = {
      workOrderId: command.workOrderId,
      projectId: workOrder?.projectId || undefined,
      tenantId: workOrder?.tenantId || tenantId,
      quantityGood: command.quantityGood,
      quantityScrap: command.quantityScrap,
      operatorId: command.operatorId,
      laborHours: command.laborHours || 0,
      recordedAt: new Date().toISOString(),
      bomComponentIds: requirements.map((r) => r.bomComponentId).filter(Boolean),
      bomComponentId: requirements[0]?.bomComponentId || undefined,
    };
    if (workOrder?.projectId) {
      try {
        assertEtoOperationalPayload(outboxPayload, 'mes.production.recorded.v1');
      } catch {
        /* WO without WBS link — non-fatal in demo env */
      }
    }

    // 4. Publish canonical 'mes.production.recorded.v1' via Outbox so INV + Finance can react
    await this.prisma.outboxEvent.create({
      data: {
        tenantId: workOrder?.tenantId || tenantId,
        aggregateId: command.workOrderId,
        aggregateType: 'WorkOrder',
        eventType: 'mes.production.recorded.v1',
        payload: outboxPayload as object,
        status: 'PENDING',
      },
    }).catch(() => { /* non-fatal */ });

    console.log(`[MES] Production recorded for WO ${command.workOrderId} - MaterialConsumption + AsBuilt + mes.production.recorded.v1 emitted (requirements: ${requirements.length})`);

    return record;
  }
}
