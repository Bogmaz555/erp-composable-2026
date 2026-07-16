import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '@prisma/client-proc';

export type PoSource = 'SHORTAGE' | 'MRP' | 'MANUAL' | 'LONG_LEAD';

export class CreatePurchaseOrderCommand {
  constructor(
    public readonly sku: string,
    public readonly quantity: number,
    public readonly meta?: {
      projectId?: string;
      bomComponentId?: string;
      itemId?: string;
      supplierId?: string;
      tenantId?: string;
      source?: PoSource;
      taskId?: string;
      unitPrice?: number;
      freightCost?: number;
      customsDuty?: number;
    },
  ) {}
}

@CommandHandler(CreatePurchaseOrderCommand)
export class CreatePurchaseOrderHandler implements ICommandHandler<CreatePurchaseOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreatePurchaseOrderCommand) {
    const meta = command.meta || {};
    const po = await this.prisma.purchaseOrder.create({
      data: {
        id: require('crypto').randomUUID(),
        tenantId: meta.tenantId || 'default',
        sku: command.sku,
        itemId: meta.itemId,
        amount: command.quantity,
        projectId: meta.projectId,
        bomComponentId: meta.bomComponentId,
        supplierId: meta.supplierId,
        source: meta.source || 'MANUAL',
        status: 'PENDING_APPROVAL',
        taskId: meta.taskId,
        unitPrice: meta.unitPrice,
        freightCost: meta.freightCost ?? 0,
        customsDuty: meta.customsDuty ?? 0,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId: meta.tenantId || 'default',
        aggregateId: po.id,
        aggregateType: 'PurchaseOrder',
        eventType: 'proc.purchaseorder.created.v1',
        payload: {
          orderId: po.id,
          sku: po.sku,
          quantity: po.amount,
          projectId: po.projectId,
          bomComponentId: po.bomComponentId,
          source: po.source,
          status: po.status,
        },
        status: OutboxStatus.PENDING,
      },
    }).catch(() => {});

    return po;
  }
}
