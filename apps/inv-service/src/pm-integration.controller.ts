import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { ReserveMaterialCommand } from './commands/reserve-material.handler';
import { CreateReservationCommand } from './commands/create-reservation.command';
import { propagation, context as otelContext } from '@opentelemetry/api';
import type { MaterialRequestedEvent } from '@erp/shared-kernel';
import { assertEtoOperationalPayload } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class PmIntegrationController {
  private readonly logger = new Logger(PmIntegrationController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,   // for reservation release queries/updates on production events
  ) {}

  @EventPattern('pm.material.requested.v1')
  async handleMaterialRequested(@Payload() payload: MaterialRequestedEvent, @Ctx() context: NatsContext) {
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

    const hdrs = context.getHeaders();
    const traceparent = hdrs?.get('traceparent') as string;
    
    if (traceparent) {
      const activeContext = propagation.extract(otelContext.active(), { traceparent });
      otelContext.with(activeContext, async () => {
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
  }

  // Production complete listener (Faza 1 ETO close-loop)
  // On mes.production.recorded.v1: release active reservations for the WO (by workOrderId or bomComponentIds),
  // create RELEASE StockTransaction records, mark genealogy progress.
  @EventPattern('mes.production.recorded.v1')
  async handleProductionRecorded(@Payload() payload: any, @Ctx() context: NatsContext) {
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

    for (const res of reservations) {
      // Mark as released (fulfilled by production)
      await this.prisma.reservation.update({
        where: { id: res.id },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      }).catch(() => {});

      // Immutable audit: RELEASE transaction (in real flow this may also trigger ISSUE/CONSUMPTION)
      await this.prisma.stockTransaction.create({
        data: {
          tenantId,
          itemId: res.itemId,
          lotId: res.lotId,
          type: 'RELEASE',
          quantity: res.quantity,
          referenceType: 'WORK_ORDER',
          referenceId: workOrderId,
          notes: res.bomComponentId ? `Reservation released on production (bomComponent ${res.bomComponentId})` : 'Reservation released on production',
          createdBy: userId,
        },
      }).catch(() => {});

      // ETO genealogy link (as-built trace): machine serial or WO id as parent
      const parentSerialOrLot =
        (payload.machineSerial as string) || `WO-${workOrderId}`;
      if (res.bomComponentId) {
        await this.prisma.itemGenealogy.create({
          data: {
            tenantId,
            parentSerialOrLot,
            childItemId: res.itemId,
            childLotId: res.lotId,
            quantityUsed: res.quantity,
            workOrderId,
            bomComponentId: res.bomComponentId,
          },
        }).catch(() => {});
      }

      // Optional: In full ETO, here we could also create the final ISSUE transaction if not already deducted.
      // For now, the reservation creation already reduced available stock; RELEASE just frees the "plan" lock.
    }

    this.logger.log(`[INV] Released ${reservations.length} reservations for WO ${workOrderId} (production recorded)`);

    // Publish canonical 'inventory.reservation.released.v1' via Outbox (for Finance WIP release, analytics, procurement)
    await this.prisma.outboxEvent.create({
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
    }).catch(() => { /* non-fatal */ });
  }

  // Real NATS listener for PLM BOM release (production pattern)
  // Replaces / complements the injectable skeleton listener for full event-driven flow
  @EventPattern('plm.bom.released.v2')
  async handlePlmBomReleased(@Payload() payload: any, @Ctx() context: NatsContext) {
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
