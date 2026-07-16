import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '@prisma/client-proc';

export class UpdatePurchaseOrderEtaCommand {
  constructor(
    public readonly orderId: string,
    public readonly expectedDeliveryDate: Date,
    public readonly updatedBy?: string,
  ) {}
}

@CommandHandler(UpdatePurchaseOrderEtaCommand)
export class UpdatePurchaseOrderEtaHandler implements ICommandHandler<UpdatePurchaseOrderEtaCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdatePurchaseOrderEtaCommand) {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id: command.orderId } });
    if (!existing) throw new Error('Zamówienie nie istnieje');

    const previousEta = existing.expectedDeliveryDate;
    
    const order = await this.prisma.purchaseOrder.update({
      where: { id: command.orderId },
      data: {
        expectedDeliveryDate: command.expectedDeliveryDate,
      },
    });

    if (
      existing.status !== 'CLOSED' && 
      existing.status !== 'REJECTED' &&
      existing.status !== 'DELIVERED'
    ) {
      const isDelayed = !previousEta || command.expectedDeliveryDate.getTime() > previousEta.getTime();
      
      if (isDelayed) {
        await this.prisma.outboxEvent.create({
          data: {
            tenantId: order.tenantId,
            aggregateId: order.id,
            aggregateType: 'PurchaseOrder',
            eventType: 'proc.eta.delayed.v1',
            payload: {
              orderId: order.id,
              sku: order.sku,
              projectId: order.projectId,
              bomComponentId: order.bomComponentId,
              previousEta: previousEta?.toISOString(),
              newEta: command.expectedDeliveryDate.toISOString(),
              updatedBy: command.updatedBy,
              tenantId: order.tenantId,
            },
            status: OutboxStatus.PENDING,
          },
        }).catch(() => {});
      }
    }

    return order;
  }
}
