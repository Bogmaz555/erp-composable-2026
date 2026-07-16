import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { OutboxStatus } from '@prisma/client-proc';

export class ApprovePurchaseOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly approvedBy: string,
    public readonly decision: 'APPROVED' | 'REJECTED',
  ) {}
}

@CommandHandler(ApprovePurchaseOrderCommand)
export class ApprovePurchaseOrderHandler implements ICommandHandler<ApprovePurchaseOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  async execute(command: ApprovePurchaseOrderCommand) {
    const { orderId, approvedBy, decision } = command;

    const order = await this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: decision,
        approvedBy,
      },
    });

    if (decision === 'REJECTED') {
      // Wyślij komunikat po szynie NATS o odrzuceniu, by PM zaktualizował status struktury
      this.natsClient.emit('procurement.order.rejected', {
        orderId: order.id,
        taskId: order.taskId,
        reason: 'Odrzucono ze względu na brak autoryzacji / budżetu',
      });
    } else if (decision === 'APPROVED') {
      await this.prisma.outboxEvent.create({
        data: {
          tenantId: order.tenantId || 'default',
          aggregateId: order.id,
          aggregateType: 'PurchaseOrder',
          eventType: 'proc.purchaseorder.approved.v1',
          payload: {
            orderId: order.id,
            sku: order.sku,
            quantity: order.amount,
            projectId: order.projectId,
            bomComponentId: order.bomComponentId,
            taskId: order.taskId,
            source: order.source,
            approvedBy,
          },
          status: OutboxStatus.PENDING,
        },
      }).catch(() => {});
    }

    return order;
  }
}
