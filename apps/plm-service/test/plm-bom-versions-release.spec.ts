import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { ReleaseBomVersionHandler } from '../src/commands/release-bom-version.handler';
import { ReleaseBomVersionCommand } from '../src/commands/release-bom-version.command';
import { PrismaService } from '../src/prisma.service';
import { DoubleBomService } from '../src/double-bom.service';

// Focused test for the critical BOM release operation (now protected by TD-001)
describe('PLM: BomVersions Release (with bomComponentId snapshot)', () => {
  let handler: ReleaseBomVersionHandler;
  let prisma: PrismaService;
  let outboxCreate: jest.Mock;

  beforeEach(async () => {
    outboxCreate = jest.fn().mockResolvedValue({});
    const store = {
      bomVersion: {
        update: jest.fn().mockResolvedValue({ id: 'bom-v2-001', status: 'RELEASED', revision: 'B' }),
      },
      outboxEvent: { create: outboxCreate },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ReleaseBomVersionHandler,
        {
          provide: PrismaService,
          useValue: {
            bomVersion: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'bom-v2-001',
                itemId: 'machine-x',
                revision: 'B',
                status: 'DRAFT',
                components: [
                  { id: 'comp-1', childItemId: 'gear-01', quantity: 4, childItem: { partNumber: 'GEAR-01' }, scrapFactor: 0 },
                  { id: 'comp-2', childItemId: 'motor-01', quantity: 1, childItem: { partNumber: 'MOT-01' }, scrapFactor: 0 },
                ],
                item: { partNumber: 'MACH-X' },
              }),
              update: store.bomVersion.update,
            },
            outboxEvent: {
              create: outboxCreate,
            },
            $transaction: jest.fn().mockImplementation(async (cb: (t: typeof store) => Promise<unknown>) => cb(store)),
          },
        },
        {
          provide: DoubleBomService,
          useValue: {
            explodeBomVersion: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: EventBus,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    handler = moduleRef.get(ReleaseBomVersionHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should release the BOM and emit plm.bom.released.v2 with full components snapshot including bomComponentId', async () => {
    const command = new ReleaseBomVersionCommand('bom-v2-001', 'engineer-42');

    const result = await handler.execute(command);

    expect(result.status).toBe('RELEASED');
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'plm.bom.released.v2',
          payload: expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ bomComponentId: 'comp-1' }),
            ]),
          }),
        }),
      }),
    );
  });
});
