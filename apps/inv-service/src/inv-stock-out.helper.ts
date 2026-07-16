import { PrismaService } from './prisma.service';
import { OutboxStatus } from '.prisma/client-inv';
import type { OutOfStockEvent } from '@erp/shared-kernel';

export async function emitStockShortage(
  prisma: PrismaService,
  payload: OutOfStockEvent & { bomComponentId?: string; tenantId?: string },
) {
  const tenantId = payload.tenantId || 'default';
  await prisma.outboxEvent.create({
    data: {
      tenantId,
      aggregateId: payload.itemId,
      aggregateType: 'Inventory',
      eventType: 'inv.stock.out.v1',
      payload: {
        itemId: payload.itemId,
        sku: payload.itemId,
        missingQuantity: payload.missingQuantity,
        projectId: payload.projectId,
        wbsElementId: payload.wbsElementId,
        taskId: payload.wbsElementId,
        bomComponentId: payload.bomComponentId,
        tenantId,
      },
      status: OutboxStatus.PENDING,
    },
  });
}
