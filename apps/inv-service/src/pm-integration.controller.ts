import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { ReserveMaterialCommand } from './commands/reserve-material.handler';
import { CreateReservationCommand } from './commands/create-reservation.command';
import { propagation, context as otelContext } from '@opentelemetry/api';
import type { MaterialRequestedEvent } from '@erp/shared-kernel';
import {
  assertEtoOperationalPayload,
  preferJetStreamConsumerPath,
} from '@erp/shared-kernel';
import { assertEtoOperationalPayload, runWithTenantAsync } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class PmIntegrationController {
  private readonly logger = new Logger(PmIntegrationController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,   // for reservation release queries/updates on production events
  ) {}

  @EventPattern('pm.material.requested.v1')
  async handleMaterialRequested(
    @Payload() payload: MaterialRequestedEvent,
    @Ctx() context: NatsContext,
    fromJetStream = false,
  ) {
    // Single consumer path: durable inv-eto-worker owns this subject when flag on
    if (!fromJetStream && preferJetStreamConsumerPath()) {
      this.logger.debug(
        'NATS_JETSTREAM on — Nest pm.material.requested.v1 skipped (inv-eto-worker)',
      );
      return;
    }
    this.logger.debug(`Received Material Requested Event for Item: ${payload.itemId}`);

    assertEtoOperationalPayload(
      {
        projectId: payload.projectId,
        tenantId: payload.tenantId,
        wbsElementId: payload.wbsElementId,
        bomComponentId: payload.bomComponentId,
      },
      'pm.material.requested.v1',
    );

    // Worker ALS: no HTTP REQUEST scope — bind tenant from event (or DEFAULT_TENANT_ID).
    const tenantForWorker =
      payload.tenantId || process.env.DEFAULT_TENANT_ID || 'default';

    return runWithTenantAsync(tenantForWorker, async () => {
      const hdrs = context.getHeaders();
      const traceparent = hdrs?.get('traceparent') as string;

      if (traceparent) {
        const activeContext = propagation.extract(otelContext.active(), { traceparent });
        await otelContext.with(activeContext, async () => {
          await this.commandBus.execute(new ReserveMaterialCommand(
            payload.projectId,
            payload.wbsElementId,
            payload.itemId,
            payload.requestedQuantity,
            payload.bomComponentId,
            payload.tenantId
          ));
        });
      } else {
        await this.commandBus.execute(new ReserveMaterialCommand(
          payload.projectId,
          payload.wbsElementId,
          payload.itemId,
          payload.requestedQuantity
        ));
      }
    });
  }

  // Production complete listener (Faza 1 ETO close-loop)
  // On mes.production.recorded.v1: release active reservations for the WO (by workOrderId or bomComponentIds),
  // create RELEASE StockTransaction records, mark genealogy progress.
  @EventPattern('mes.production.recorded.v1')
  async handleProductionRecorded(
    @Payload() payload: any,
    @Ctx() context: NatsContext,
    fromJetStream = false,
  ) {
    if (!fromJetStream && preferJetStreamConsumerPath()) {
      this.logger.debug(
        'NATS_JETSTREAM on — Nest mes.production.recorded.v1 skipped (inv-eto-worker)',
      );
      return;
    }
    this.logger.debug(`[INV] Received mes.production.recorded.v1 for WO ${payload.workOrderId}`);

    if (payload.projectId) {
      assertEtoOperationalPayload(
        {
          projectId: payload.projectId,
          tenantId: payload.tenantId,
          bomComponentId: payload.bomComponentId,
        },
        'mes.production.recorded.v1',
      );
    }

    // TD-001: Extract authenticated user claims from NATS headers (propagated via Gateway / callers)
    const hdrs = context.getHeaders();
    const userId = (hdrs?.['x-user-id'] as string) || 'system';
    const roles = (hdrs?.['x-roles'] as string) || '';
    if (userId !== 'system') {
      this.logger.log(`[TD-001] Production recorded -> reservation release processed by user=${userId} roles=${roles}`);
    }

    const workOrderId = payload.workOrderId;
    const tenantId = payload.tenantId || 'default';
    const bomComponentIds: string[] = payload.bomComponentIds || [];

    if (!workOrderId) return;

    // Find active reservations for this WO (or matching bomComponents)
    const reservations = await this.prisma.reservation.findMany({
      where: {
        workOrderId,
        tenantId,
        status: 'ACTIVE',
        ...(bomComponentIds.length > 0 ? { bomComponentId: { in: bomComponentIds } } : {}),
      },
    }).catch(() => []);

    if (!reservations || reservations.length === 0) {
      this.logger.log(`[INV] No active reservations found to release for WO ${workOrderId}`);
      return;
    }

    // Domain release + genealogy + outbox in one TX (no empty .catch on outbox)
    await this.prisma.$transaction(async (tx) => {
      for (const res of reservations) {
        await tx.reservation.update({
          where: { id: res.id },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
          },
        });

        await tx.stockTransaction.create({
          data: {
            tenantId,
            itemId: res.itemId,
            lotId: res.lotId,
            type: 'RELEASE',
            quantity: res.quantity,
            referenceType: 'WORK_ORDER',
            referenceId: workOrderId,
            notes: res.bomComponentId
              ? `Reservation released on production (bomComponent ${res.bomComponentId})`
              : 'Reservation released on production',
            createdBy: userId,
          },
        });

        // ETO genealogy link (as-built trace): machine serial or WO id as parent
        const parentSerialOrLot =
          (payload.machineSerial as string) || `WO-${workOrderId}`;
        if (res.bomComponentId) {
          await tx.itemGenealogy.create({
            data: {
              tenantId,
              parentSerialOrLot,
              childItemId: res.itemId,
              childLotId: res.lotId,
              quantityUsed: res.quantity,
              workOrderId,
              bomComponentId: res.bomComponentId,
            },
          });
        }
      }

      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateId: workOrderId,
          aggregateType: 'WorkOrder',
          eventType: 'inventory.reservation.released.v1',
          payload: {
            workOrderId,
            tenantId,
            releasedReservations: reservations.map(r => ({
              reservationId: r.id,
              bomComponentId: r.bomComponentId,
              itemId: r.itemId,
              quantity: r.quantity,
              projectId: r.projectId,
            })),
            releasedAt: new Date().toISOString(),
          },
          status: 'PENDING',
        },
      });
    });

    this.logger.log(`[INV] Released ${reservations.length} reservations for WO ${workOrderId} (production recorded)`);
  }

  // Real NATS listener for PLM BOM release (production pattern)
  // Replaces / complements the injectable skeleton listener for full event-driven flow
  @EventPattern('plm.bom.released.v2')
  async handlePlmBomReleased(
    @Payload() payload: any,
    @Ctx() context: NatsContext,
    fromJetStream = false,
  ) {
    if (!fromJetStream && preferJetStreamConsumerPath()) {
      this.logger.debug(
        'NATS_JETSTREAM on — Nest plm.bom.released.v2 skipped (inv-eto-worker)',
      );
      return;
    }
    this.logger.debug(`[INV] Received plm.bom.released.v2 for BOM ${payload.bomVersionId}`);

    // TD-001: Extract authenticated user claims from NATS headers (consistent with MES pattern)
    const hdrs = context.getHeaders();
    const userId = (hdrs?.['x-user-id'] as string) || 'system';
    const roles = (hdrs?.['x-roles'] as string) || '';
    const effectiveReleasedBy = (hdrs?.['x-user-id'] as string) || payload.releasedBy || 'system';
    if (userId !== 'system') {
      this.logger.log(`[TD-001] BOM release -> auto-reservations processed by user=${userId} roles=${roles}`);
    }

    if (!payload.components || !Array.isArray(payload.components)) {
      this.logger.warn('[INV] bom.released payload missing components snapshot');
      return;
    }

    if (payload.projectId) {
      assertEtoOperationalPayload(
        { projectId: payload.projectId, tenantId: payload.tenantId, bomComponentId: payload.bomVersionId },
        'plm.bom.released.v2',
      );
    }

    const projectId = payload.projectId || null;
    const tenantId = payload.tenantId || 'default';
    const releasedBy = effectiveReleasedBy;

    for (const comp of payload.components) {
      if (comp.isSubAssembly) continue;

      const bomComponentId = comp.bomComponentId || comp.id || null;
      const itemId = comp.childItemId || comp.itemId;
      const qty = comp.quantity || 0;

      if (!itemId) continue;

      await this.commandBus.execute(new CreateReservationCommand(
        itemId,
        qty,
        projectId || undefined,
        payload.workOrderId || undefined,
        undefined,
        bomComponentId,
        tenantId,
        releasedBy
      ));
    }

    this.logger.log(`[INV] Auto-reservations created via real NATS for BOM ${payload.bomVersionId}`);
  }
}
