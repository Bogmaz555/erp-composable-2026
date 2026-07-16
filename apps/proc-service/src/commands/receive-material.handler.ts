import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '@prisma/client-proc';

export class ReceiveMaterialCommand {
  constructor(
    public readonly orderId: string,
    public readonly receivedQuantity: number,
    public readonly receivedBy?: string,
    public readonly freightCost?: number,
    public readonly customsDuty?: number,
    public readonly unitPrice?: number,
  ) {}
}

/**
 * Goods receipt — closes PO loop toward Inventory (Faza 3 next step).
 */
@CommandHandler(ReceiveMaterialCommand)
export class ReceiveMaterialHandler implements ICommandHandler<ReceiveMaterialCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReceiveMaterialCommand) {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id: command.orderId } });
    if (!existing) throw new Error('Zamówienie nie istnieje');

    const newReceivedQty = (existing.receivedQty || 0) + command.receivedQuantity;
    const qty = command.receivedQuantity || existing.amount;
    const unitPrice = command.unitPrice ?? existing.unitPrice ?? 0;
    const freight = command.freightCost ?? existing.freightCost ?? 0;
    const customs = command.customsDuty ?? existing.customsDuty ?? 0;
    const totalCost = unitPrice * qty + freight + customs;
    const landedUnitCost = qty > 0 ? Math.round((totalCost / qty) * 10000) / 10000 : 0;
    
    let newStatus = existing.status;
    if (newReceivedQty >= existing.amount) {
      newStatus = 'DELIVERED';
    } else if (newReceivedQty > 0) {
      newStatus = 'PARTIALLY_DELIVERED';
    }

    const order = await this.prisma.purchaseOrder.update({
      where: { id: command.orderId },
      data: {
        status: newStatus,
        receivedQty: newReceivedQty,
        receivedAt: new Date(),
        unitPrice,
        freightCost: freight,
        customsDuty: customs,
        landedUnitCost,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId: order.tenantId,
        aggregateId: order.id,
        aggregateType: 'PurchaseOrder',
        eventType: 'proc.material.received.v1',
        payload: {
          purchaseOrderId: order.id,
          sku: order.sku,
          quantity: qty,
          unitPrice,
          freightCost: freight,
          customsDuty: customs,
          landedUnitCost,
          projectId: order.projectId,
          bomComponentId: order.bomComponentId,
          receivedAt: new Date().toISOString(),
          receivedBy: command.receivedBy || 'warehouse',
        },
        status: OutboxStatus.PENDING,
      },
    }).catch(() => {});

    return order;
  }
}
