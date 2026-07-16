import { GetGenealogyChainHandler } from '../apps/inv-service/src/queries/get-genealogy-chain.handler';
import { GetGenealogyChainQuery } from '../apps/inv-service/src/queries/get-genealogy-chain.query';

describe('Genealogy chain contract', () => {
  it('returns summary with work orders', async () => {
    const prisma = {
      itemGenealogy: {
        findMany: async () => [
          { workOrderId: 'wo-1', bomComponentId: 'bc-1', quantityUsed: 2, consumedAt: new Date() },
          { workOrderId: 'wo-1', bomComponentId: 'bc-2', quantityUsed: 1, consumedAt: new Date() },
        ],
      },
    };
    const handler = new GetGenealogyChainHandler(prisma as any);
    const out = await handler.execute(new GetGenealogyChainQuery('SN-TEST', 'default'));
    expect(out.count).toBe(2);
    expect(out.summary.workOrders).toBe(1);
    expect(out.summary.totalQuantityUsed).toBe(3);
  });
});
