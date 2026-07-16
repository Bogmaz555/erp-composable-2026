import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

@Controller('compensation')
export class SagaCompensationController {
  private readonly logger = new Logger(SagaCompensationController.name);
  private processed = 0;

  constructor(private readonly prisma: PrismaService) {}

  /** Dev smoke: seed RELEASED reservation for compensation delta tests */
  @Post('seed-released')
  async seedReleased(
    @Body() body: { itemId?: string; quantity?: number; workOrderId?: string; tenantId?: string },
  ) {
    const tenantId = body.tenantId || 'default';
    const qty = body.quantity ?? 5;
    const workOrderId = body.workOrderId || `wo-seed-${Date.now()}`;

    let itemId = body.itemId;
    if (!itemId) {
      let item = await this.prisma.item.findFirst({ where: { tenantId } }).catch(() => null);
      if (!item) {
        item = await this.prisma.item.create({
          data: {
            tenantId,
            sku: `SMOKE-DELTA-${Date.now()}`,
            name: 'Compensation Smoke Item',
            type: 'COMPONENT',
            stockQuantity: 10,
          },
        }).catch(() => null);
      }
      if (!item) return { ok: false, reason: 'no items' };
      itemId = item.id;
    }

    const before = await this.prisma.item.findFirst({ where: { id: itemId, tenantId } }).catch(() => null);
    const stockBefore = before?.stockQuantity ?? 0;

    const res = await this.prisma.reservation.create({
      data: {
        tenantId,
        itemId,
        quantity: qty,
        status: 'RELEASED',
        workOrderId,
        projectId: 'proj-comp-smoke',
        releasedAt: new Date(),
        createdBy: 'compensation-seed',
      },
    }).catch(() => null);

    if (!res) return { ok: false, reason: 'reservation create failed' };

    return {
      ok: true,
      reservationId: res.id,
      itemId,
      workOrderId,
      quantity: qty,
      stockBefore,
      tenantId,
    };
  }

  /** HTTP trigger for smoke tests (no NATS client required) */
  @Post('trigger-restore')
  async triggerRestore(@Body() body: { workOrderId: string; tenantId?: string }) {
    await this.handleReservationRestored({
      compensate: true,
      tenantId: body.tenantId || 'default',
      workOrderId: body.workOrderId,
      compensatedStep: 'inventory.reservation.released.v1',
    });
    return { ok: true, workOrderId: body.workOrderId };
  }

  @Get('status')
  async status() {
    const recent = await this.prisma.stockTransaction.count({
      where: { notes: { contains: 'SAGA_COMPENSATE' } },
    }).catch(() => 0);
    return {
      service: 'inv-service',
      compensationEventsProcessed: this.processed,
      compensationTransactions: recent,
    };
  }

  @EventPattern('inventory.reservation.restored')
  async handleReservationRestored(@Payload() payload: Record<string, unknown>) {
    if (!payload?.compensate) return;
    const tenantId = String(payload.tenantId || 'default');
    const workOrderId = String(payload.workOrderId || payload.correlationId || '');
    this.logger.log(`[INV] compensation: reservation.restored WO=${workOrderId}`);

    const released = await this.prisma.reservation.findMany({
      where: { tenantId, workOrderId: workOrderId || undefined, status: 'RELEASED' },
      take: 20,
    }).catch(() => []);

    for (const res of released) {
      await this.prisma.reservation.update({
        where: { id: res.id },
        data: { status: 'ACTIVE', releasedAt: null },
      }).catch(() => {});
      await this.restoreStock(tenantId, res.itemId, res.lotId, res.quantity);
      await this.prisma.stockTransaction.create({
        data: {
          tenantId,
          itemId: res.itemId,
          lotId: res.lotId,
          type: 'ADJUST',
          quantity: res.quantity,
          referenceType: 'SAGA_COMPENSATE',
          referenceId: workOrderId || res.id,
          notes: `SAGA_COMPENSATE: reservation restored (${payload.compensatedStep || 'unknown'})`,
          createdBy: 'saga-compensator',
        },
      }).catch(() => {});
    }
    this.processed++;
  }

  @EventPattern('mes.production.reversed')
  async handleProductionReversed(@Payload() payload: Record<string, unknown>) {
    if (!payload?.compensate) return;
    const workOrderId = String(payload.workOrderId || '');
    const tenantId = String(payload.tenantId || 'default');
    this.logger.log(`[INV] compensation: production.reversed WO=${workOrderId}`);

    if (workOrderId) {
      const active = await this.prisma.reservation.findMany({
        where: { tenantId, workOrderId, status: 'RELEASED' },
        take: 20,
      }).catch(() => []);
      for (const res of active) {
        await this.prisma.reservation.update({
          where: { id: res.id },
          data: { status: 'ACTIVE', releasedAt: null },
        }).catch(() => {});
        await this.restoreStock(tenantId, res.itemId, res.lotId, res.quantity);
      }
    }
    this.processed++;
  }

  /** Real stock rollback — przywraca quantity na Item + StockLevel + Lot */
  private async restoreStock(tenantId: string, itemId: string, lotId: string | null, qty: number) {
    if (qty <= 0) return;
    await this.prisma.item.updateMany({
      where: { id: itemId, tenantId },
      data: { stockQuantity: { increment: qty } },
    }).catch(() => {});
    const level = await this.prisma.stockLevel.findFirst({
      where: { itemId, tenantId },
    }).catch(() => null);
    if (level) {
      await this.prisma.stockLevel.update({
        where: { id: level.id },
        data: { quantity: { increment: qty } },
      }).catch(() => {});
    }
    if (lotId) {
      await this.prisma.lot.updateMany({
        where: { id: lotId, tenantId },
        data: { quantity: { increment: qty }, status: 'AVAILABLE' },
      }).catch(() => {});
    }
  }
}
