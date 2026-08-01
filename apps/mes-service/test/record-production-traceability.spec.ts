import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { RecordProductionHandler } from '../src/commands/record-production.handler';
import { RecordProductionCommand } from '../src/commands/record-production.command';
import { PrismaService } from '../src/prisma.service';

function mockPrismaTx(store: Record<string, unknown>) {
  return {
    ...store,
    $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
  };
}

// Basic unit test skeleton for ETO traceability in production recording
// Covers bomComponentId flow to MaterialConsumption + event emission
describe('MES Traceability: RecordProductionHandler (Faza 1 ETO)', () => {
  let handler: RecordProductionHandler;
  let prisma: PrismaService;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    const store = {
      productionRecord: {
        create: jest.fn().mockResolvedValue({ id: 'pr-1', workOrderId: 'wo-123' }),
      },
      materialRequirement: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      materialConsumption: { create: jest.fn() },
      asBuiltRecord: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      workOrder: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RecordProductionHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaTx(store),
        },
        { provide: CommandBus, useValue: commandBus },
        { provide: EventBus, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    handler = moduleRef.get(RecordProductionHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should create production record and trigger consumption with bomComponentId when requirements exist', async () => {
    const command = new RecordProductionCommand('wo-123', 5, 0, 'op-1');

    // Mock requirements with bomComponentId
    (prisma as any).materialRequirement.findMany.mockResolvedValue([
      { id: 'req-1', itemId: 'item-abc', bomComponentId: 'bom-comp-xyz', quantity: 10, reservedQty: 5 },
    ]);

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).productionRecord.create).toHaveBeenCalled();
    // Verify that ConsumeMaterialCommand path is exercised (with bomComponentId)
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: 'wo-123',
        bomComponentId: 'bom-comp-xyz',
      }),
    );
  });

  it('should emit mes.production.recorded.v1 via Outbox with bomComponentIds', async () => {
    const command = new RecordProductionCommand('wo-456', 2);

    await handler.execute(command);

    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'mes.production.recorded.v1',
          payload: expect.objectContaining({ bomComponentIds: expect.any(Array) }),
        }),
      }),
    );
  });
});
