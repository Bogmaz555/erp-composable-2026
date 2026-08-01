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

    // Domain status change + outbox (when APPROVED) in one TX
    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: decision,
          approvedBy,
        },
      });

      if (decision === 'APPROVED') {
        await tx.outboxEvent.create({
          data: {
            tenantId: updated.tenantId || 'default',
            aggregateId: updated.id,
            aggregateType: 'PurchaseOrder',
            eventType: 'proc.purchaseorder.approved.v1',
            payload: {
              orderId: updated.id,
              sku: updated.sku,
              quantity: updated.amount,
              projectId: updated.projectId,
              bomComponentId: updated.bomComponentId,
              taskId: updated.taskId,
              source: updated.source,
              approvedBy,
            },
            status: OutboxStatus.PENDING,
          },
        });
      }

      return updated;
    });

    if (decision === 'REJECTED') {
      // Legacy NATS emit for rejection (not yet on outbox path)
      this.natsClient.emit('procurement.order.rejected', {
        orderId: order.id,
        taskId: order.taskId,
        reason: 'Odrzucono ze względu na brak autoryzacji / budżetu',
      });
    }

    return order;
  }
}
