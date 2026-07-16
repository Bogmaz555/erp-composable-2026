import { emitStockShortage } from '../src/inv-stock-out.helper';

describe('emitStockShortage', () => {
  it('writes inv.stock.out.v1 to outbox with traceability fields', async () => {
    const created: unknown[] = [];
    const prisma = {
      outboxEvent: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return data;
        }),
      },
    };

    await emitStockShortage(prisma as never, {
      itemId: 'SKU-42',
      sku: 'SKU-42',
      missingQuantity: 5,
      projectId: 'proj-1',
      wbsElementId: 'wbs-9',
      bomComponentId: 'bom-comp-1',
      tenantId: 'tenant-a',
    });

    expect(prisma.outboxEvent.create).toHaveBeenCalledTimes(1);
    const row = created[0] as { eventType: string; payload: Record<string, unknown> };
    expect(row.eventType).toBe('inv.stock.out.v1');
    expect(row.payload).toMatchObject({
      itemId: 'SKU-42',
      sku: 'SKU-42',
      missingQuantity: 5,
      projectId: 'proj-1',
      wbsElementId: 'wbs-9',
      bomComponentId: 'bom-comp-1',
      tenantId: 'tenant-a',
    });
  });
});
