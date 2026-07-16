import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ReleaseBomVersionHandler } from '../src/commands/release-bom-version.handler';
import { ReleaseBomVersionCommand } from '../src/commands/release-bom-version.command';
import { PrismaService } from '../src/prisma.service';

// Test skeleton for BOM release (critical ETO trigger)
describe('PLM: ReleaseBomVersionHandler', () => {
  let handler: ReleaseBomVersionHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
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
              update: jest.fn().mockResolvedValue({ id: 'bom-v1', status: 'RELEASED' }),
            },
            outboxEvent: { create: jest.fn() },
          },
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
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'plm.bom.released.v2' })
    );
  });
});
