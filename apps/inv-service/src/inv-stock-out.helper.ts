import { PrismaService } from './prisma.service';
import { OutboxStatus } from '.prisma/client-inv';
import type { OutOfStockEvent } from '@erp/shared-kernel';

/** Minimal client surface so callers can pass PrismaService or $transaction `tx`. */
export type OutboxWriter = {
  outboxEvent: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

/**
 * Emit inv.stock.out.v1 via outbox.
 * When called inside an open $transaction, pass `tx` so domain + shortage share one TX.
 * No empty .catch — failures propagate (and roll back the surrounding TX when applicable).
 */
export async function emitStockShortage(
  prisma: OutboxWriter | PrismaService,
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
