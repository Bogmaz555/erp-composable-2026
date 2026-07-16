import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { PmIntegrationController } from '../src/pm-integration.controller';
import { PrismaService } from '../src/prisma.service';

// Skeleton for detailed INV release on production (Faza 1)
describe('INV: PmIntegration release on mes.production.recorded.v1', () => {
  let controller: PmIntegrationController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [PmIntegrationController],
      providers: [
        CommandBus,
        {
          provide: PrismaService,
          useValue: {
            reservation: {
              findMany: jest.fn().mockResolvedValue([
                { id: 'r1', workOrderId: 'wo-1', bomComponentId: 'bc-1', itemId: 'i1', quantity: 5, status: 'ACTIVE' }
              ]),
              update: jest.fn(),
            },
            stockTransaction: { create: jest.fn() },
            outboxEvent: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(PmIntegrationController);
    prisma = moduleRef.get(PrismaService);
  });

  it('should release reservations and emit released event', async () => {
    const payload = { workOrderId: 'wo-1', bomComponentIds: ['bc-1'] };

    await (controller as any).handleProductionRecorded(payload, { getHeaders: () => ({}) });

    expect((prisma as any).reservation.update).toHaveBeenCalled();
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'inventory.reservation.released.v1' })
    );
  });
});
