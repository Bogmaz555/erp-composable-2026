import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { ReleaseBomVersionHandler } from '../src/commands/release-bom-version.handler';
import { ReleaseBomVersionCommand } from '../src/commands/release-bom-version.command';
import { PrismaService } from '../src/prisma.service';
import { DoubleBomService } from '../src/double-bom.service';

// Test skeleton for BOM release (critical ETO trigger)
describe('PLM: ReleaseBomVersionHandler', () => {
  let handler: ReleaseBomVersionHandler;
  let prisma: PrismaService;
  let outboxCreate: jest.Mock;

  beforeEach(async () => {
    outboxCreate = jest.fn().mockResolvedValue({});
    const store = {
      bomVersion: {
        update: jest.fn().mockResolvedValue({ id: 'bom-v1', status: 'RELEASED', revision: 'A' }),
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
                id: 'bom-v1',
                itemId: 'item-1',
                revision: 'A',
                components: [],
                item: { partNumber: 'M-001' },
              }),
              update: store.bomVersion.update,
            },
            outboxEvent: { create: outboxCreate },
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

  it('should release BOM and emit plm.bom.released.v2 with components snapshot', async () => {
    const command = new ReleaseBomVersionCommand('bom-v1', 'engineer-1');

    const result = await handler.execute(command);

    expect(result.status).toBe('RELEASED');
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'plm.bom.released.v2' }),
      }),
    );
  });
});
