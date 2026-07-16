import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ReleaseBomVersionHandler } from '../src/commands/release-bom-version.handler';
import { ReleaseBomVersionCommand } from '../src/commands/release-bom-version.command';
import { PrismaService } from '../src/prisma.service';

// Focused test for the critical BOM release operation (now protected by TD-001)
describe('PLM: BomVersions Release (with bomComponentId snapshot)', () => {
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
                id: 'bom-v2-001',
                itemId: 'machine-x',
                revision: 'B',
                status: 'DRAFT',
                components: [
                  { id: 'comp-1', childItemId: 'gear-01', quantity: 4 },
                  { id: 'comp-2', childItemId: 'motor-01', quantity: 1 },
                ],
                item: { partNumber: 'MACH-X' },
              }),
              update: jest.fn().mockResolvedValue({ id: 'bom-v2-001', status: 'RELEASED' }),
            },
            outboxEvent: {
              create: jest.fn().mockResolvedValue({}),
            },
          },
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
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'plm.bom.released.v2',
        payload: expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ bomComponentId: 'comp-1' }),
          ]),
        }),
      })
    );
  });
});
