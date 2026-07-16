import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

export interface MaterialReceivedPayload {
  purchaseOrderId: string;
  sku: string;
  quantity: number;
  projectId?: string;
  bomComponentId?: string;
  receivedAt?: string;
  receivedBy?: string;
}

@Controller()
export class ProcIntegrationController {
  private readonly logger = new Logger(ProcIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('proc.material.received.v1')
  async handleMaterialReceived(@Payload() payload: MaterialReceivedPayload) {
    const item = await this.prisma.item.findUnique({ where: { sku: payload.sku } });
    if (!item) {
      this.logger.warn(`[INV] Receipt skipped — unknown SKU ${payload.sku}`);
      return { ok: false, reason: 'ITEM_NOT_FOUND' };
    }

    const stock = await this.prisma.stockLevel.findFirst({
      where: { itemId: item.id, tenantId: 'default', location: 'QUARANTINE' },
    });

    if (stock) {
      await this.prisma.stockLevel.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + payload.quantity },
      });
    } else {
      await this.prisma.stockLevel.create({
        data: {
          tenantId: 'default',
          itemId: item.id,
          quantity: payload.quantity,
          location: 'QUARANTINE',
        },
      });
    }

    await this.prisma.stockTransaction.create({
      data: {
        tenantId: 'default',
        itemId: item.id,
        type: 'RECEIPT',
        quantity: payload.quantity,
        referenceType: 'PURCHASE_ORDER',
        referenceId: payload.purchaseOrderId,
        notes: payload.bomComponentId
          ? `Goods receipt PO ${payload.purchaseOrderId}, bom ${payload.bomComponentId}`
          : `Goods receipt PO ${payload.purchaseOrderId}`,
        createdBy: payload.receivedBy || 'proc-integration',
      },
    });

    this.logger.log(
      `[INV] Received ${payload.quantity}× ${payload.sku} from PO ${payload.purchaseOrderId}`,
    );
    return { ok: true, itemId: item.id };
  }
}
