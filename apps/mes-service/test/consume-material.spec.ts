import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { ConsumeMaterialHandler } from '../src/commands/consume-material.handler';
import { ConsumeMaterialCommand } from '../src/commands/consume-material.command';
import { PrismaService } from '../src/prisma.service';

describe('MES: ConsumeMaterialHandler (bomComponentId genealogy)', () => {
  let handler: ConsumeMaterialHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        ConsumeMaterialHandler,
        {
          provide: PrismaService,
          useValue: {
            materialConsumption: {
              create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
            },
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(ConsumeMaterialHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should persist MaterialConsumption with bomComponentId', async () => {
    const command = new ConsumeMaterialCommand('wo-789', 'item-motor', null, 2, 'bom-comp-motor-001');

    const result = await handler.execute(command);

    expect((prisma as any).materialConsumption.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bomComponentId: 'bom-comp-motor-001',
          workOrderId: 'wo-789',
        }),
      })
    );
    expect(result).toBeDefined();
  });
});
