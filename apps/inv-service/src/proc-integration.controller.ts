import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import type { ProcMaterialReceivedV1Event } from '@erp/shared-kernel';
import { resolveEventId, withProcessedEventGuard } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class ProcIntegrationController {
  private readonly logger = new Logger(ProcIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('proc.material.received.v1')
  async handleMaterialReceived(@Payload() payload: ProcMaterialReceivedV1Event) {
    const eventId =
      resolveEventId({
        eventId: (payload as { eventId?: string }).eventId,
        correlationId: (payload as { correlationId?: string }).correlationId,
        id: payload.purchaseOrderId,
      }) ||
      `proc.material.received:${payload.purchaseOrderId}:${payload.sku}:${payload.receivedAt || payload.quantity}`;

    const guard = await withProcessedEventGuard(
      this.prisma as never,
      { eventId, consumer: 'inv-proc-material-received' },
      async () => this.applyGoodsReceipt(payload),
    );

    if (guard.idempotent) {
      this.logger.debug(`[INV] Idempotent skip goods receipt ${eventId}`);
      return { ok: true, idempotent: true };
    }
    return guard.result;
  }

  private async applyGoodsReceipt(payload: ProcMaterialReceivedV1Event) {
    const tenantId = payload.tenantId || 'default';
    const item = await this.prisma.item.findUnique({ where: { sku: payload.sku } });
    if (!item) {
      this.logger.warn(`[INV] Receipt skipped — unknown SKU ${payload.sku}`);
      return { ok: false, reason: 'ITEM_NOT_FOUND' };
    }

    const lotNumber =
      payload.lotNumber ||
      `LOT-${payload.purchaseOrderId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
    const serialNumber =
      payload.serialNumber ||
      (payload.quantity === 1 ? undefined : undefined);

    const result = await this.prisma.$transaction(async (tx) => {
      const lot = await tx.lot.create({
        data: {
          id: randomUUID(),
          tenantId,
          itemId: item.id,
          lotNumber,
          serialNumber: serialNumber ?? null,
          quantity: payload.quantity,
          location: 'QUARANTINE',
          status: 'AVAILABLE',
          createdBy: payload.receivedBy || 'proc-integration',
        },
      });

      const stock = await tx.stockLevel.findFirst({
        where: { itemId: item.id, tenantId, location: 'QUARANTINE' },
      });

      if (stock) {
        await tx.stockLevel.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity + payload.quantity },
        });
      } else {
        await tx.stockLevel.create({
          data: {
            tenantId,
            itemId: item.id,
            quantity: payload.quantity,
            location: 'QUARANTINE',
          },
        });
      }

      await tx.item.update({
        where: { id: item.id },
        data: { stockQuantity: { increment: payload.quantity } },
      });

      await tx.stockTransaction.create({
        data: {
          tenantId,
          itemId: item.id,
          lotId: lot.id,
          type: 'RECEIPT',
          quantity: payload.quantity,
          referenceType: 'PURCHASE_ORDER',
          referenceId: payload.purchaseOrderId,
          notes: payload.bomComponentId
            ? `Goods receipt PO ${payload.purchaseOrderId}, bom ${payload.bomComponentId}, lot ${lotNumber}`
            : `Goods receipt PO ${payload.purchaseOrderId}, lot ${lotNumber}`,
          createdBy: payload.receivedBy || 'proc-integration',
        },
      });

      return { lotId: lot.id, lotNumber };
    });

    this.logger.log(
      `[INV] Received ${payload.quantity}× ${payload.sku} lot=${result.lotNumber} from PO ${payload.purchaseOrderId}`,
    );
    return { ok: true, itemId: item.id, ...result };
  }
}
