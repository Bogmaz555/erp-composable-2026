import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateReservationCommand } from '../commands/create-reservation.command';

// Production-grade listener skeleton for plm.bom.released.v2 (ETO traceability entry point)
// Real deployment: use @EventPattern('plm.bom.released.v2') + NATS microservice transport
@Injectable()
export class PlmBomReleasedListener implements OnModuleInit {
  constructor(
    @Inject('NATS_SERVICE') private readonly client: ClientProxy,
    private readonly commandBus: CommandBus,
  ) {}

  onModuleInit() {
    console.log('[INV] PlmBomReleasedListener ready for bom.released.v2 (Manufacturing Core traceability)');
  }

  async handleBomReleased(payload: any) {
    console.log('[INV] Received plm.bom.released.v2 - auto-creating reservations for ETO build', {
      bomVersionId: payload.bomVersionId,
      itemId: payload.itemId,
      projectId: payload.projectId,
      componentCount: payload.components?.length || 0,
    });

    if (!payload.components || !Array.isArray(payload.components)) {
      console.warn('[INV] bom.released payload missing components snapshot - skipping auto-reserve');
      return;
    }

    const projectId = payload.projectId || null;
    const tenantId = payload.tenantId || 'default';
    const releasedBy = payload.releasedBy || 'system';

    for (const comp of payload.components) {
      // Support both current v2 shape and future enhanced shape with bomComponentId
      const bomComponentId = comp.bomComponentId || comp.id || null;
      const itemId = comp.childItemId || comp.itemId;

      if (!itemId) continue;

      await this.commandBus.execute(new CreateReservationCommand(
        itemId,
        comp.quantity || 0,
        projectId || undefined,
        payload.workOrderId || undefined,
        undefined, // lotId - allocated later in detailed planning
        bomComponentId,
        tenantId,
        releasedBy
      ));
    }

    console.log(`[INV] Auto-reservations created for BOM ${payload.bomVersionId} (project ${projectId || 'N/A'})`);
  }

  // Manual trigger for demo / testing the full ETO flow (in real: NATS + Outbox relay)
  async triggerForTesting(bomPayload: any) {
    await this.handleBomReleased(bomPayload);
  }
}
