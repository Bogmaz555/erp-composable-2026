import { GetGenealogyForwardHandler } from './get-genealogy-forward.handler';
import { GetGenealogyForwardQuery } from './get-genealogy-forward.query';

describe('GetGenealogyForwardHandler', () => {
  it('returns forward links for a machine serial', async () => {
    const prisma = {
      itemGenealogy: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'g1',
            parentSerialOrLot: 'SN-MACHINE-001',
            childItemId: 'motor-001',
            bomComponentId: 'bc-1',
            quantityUsed: 2,
          },
        ]),
      },
    };
    const handler = new GetGenealogyForwardHandler(prisma as any);
    const result = await handler.execute(
      new GetGenealogyForwardQuery('SN-MACHINE-001', 'tenant-1'),
    );

    expect(result.direction).toBe('forward');
    expect(result.count).toBe(1);
    expect(result.links[0].bomComponentId).toBe('bc-1');
  });
});
