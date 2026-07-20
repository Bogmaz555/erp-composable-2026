import { DoubleBomService } from '../apps/plm-service/src/double-bom.service';

describe('Double BOM contract', () => {
  it('explodeBomVersion returns array shape', async () => {
    const svc = new DoubleBomService({} as any);
    const mockBom = {
      components: [
        {
          id: 'c1',
          childItemId: 'item-1',
          quantity: 2,
          scrapFactor: 0,
          position: 1,
          subBomVersionId: null,
          childItem: { partNumber: 'PART-1' },
        },
      ],
    };
    (svc as any).prisma = {
      bomVersion: {
        findUnique: async () => mockBom,
        findFirst: async () => null,
      },
      bomComponent: { count: async () => 1 },
    };
    const lines = await svc.explodeBomVersion('bom-1');
    expect(lines.length).toBe(1);
    expect(lines[0].bomComponentId).toBe('c1');
    expect(lines[0].isSubAssembly).toBe(false);
  });
});
