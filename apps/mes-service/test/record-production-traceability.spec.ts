import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus, EventBus } from '@nestjs/cqrs';
import { RecordProductionHandler } from '../src/commands/record-production.handler';
import { RecordProductionCommand } from '../src/commands/record-production.command';
import { PrismaService } from '../src/prisma.service';

// Basic unit test skeleton for ETO traceability in production recording
// Covers bomComponentId flow to MaterialConsumption + event emission
describe('MES Traceability: RecordProductionHandler (Faza 1 ETO)', () => {
  let handler: RecordProductionHandler;
  let prisma: PrismaService;
  let commandBus: CommandBus;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        RecordProductionHandler,
        {
          provide: PrismaService,
          useValue: {
            productionRecord: { create: jest.fn() },
            materialRequirement: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
            materialConsumption: { create: jest.fn() },
            asBuiltRecord: { create: jest.fn() },
            outboxEvent: { create: jest.fn() },
          },
        },
        CommandBus,
        EventBus,
      ],
    }).compile();

    handler = moduleRef.get(RecordProductionHandler);
    prisma = moduleRef.get(PrismaService);
    commandBus = moduleRef.get(CommandBus);
  });

  it('should create production record and trigger consumption with bomComponentId when requirements exist', async () => {
    const command = new RecordProductionCommand('wo-123', 5, 0, 'op-1');

    // Mock requirements with bomComponentId
    (prisma as any).materialRequirement.findMany.mockResolvedValue([
      { id: 'req-1', itemId: 'item-abc', bomComponentId: 'bom-comp-xyz', quantity: 10, reservedQty: 5 },
    ]);

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).productionRecord.create).toHaveBeenCalled();
    // Verify that ConsumeMaterialCommand path is exercised (with bomComponentId)
    expect(commandBus.execute).toHaveBeenCalledWith(expect.objectContaining({
      workOrderId: 'wo-123',
      bomComponentId: 'bom-comp-xyz',
    }));
  });

  it('should emit mes.production.recorded.v1 via Outbox with bomComponentIds', async () => {
    const command = new RecordProductionCommand('wo-456', 2);

    await handler.execute(command);

    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'mes.production.recorded.v1',
        payload: expect.objectContaining({ bomComponentIds: expect.any(Array) }),
      })
    );
  });
});