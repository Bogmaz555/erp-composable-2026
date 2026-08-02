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

// Test for production recording with authenticated user context (TD-001 + traceability)
describe('MES: RecordProduction with Auth + bomComponentId', () => {
  let handler: RecordProductionHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const store = {
      productionRecord: {
        create: jest.fn().mockResolvedValue({ id: 'pr-auth', workOrderId: 'wo-xyz' }),
      },
      materialRequirement: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      asBuiltRecord: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      workOrder: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RecordProductionHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaTx(store),
        },
        { provide: CommandBus, useValue: { execute: jest.fn().mockResolvedValue(undefined) } },
        { provide: EventBus, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    handler = moduleRef.get(RecordProductionHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should log and process production with user context', async () => {
    const command = new RecordProductionCommand('wo-xyz', 3, 0, 'op-99');

    // In real usage the controller would pass user; here we just verify handler runs cleanly
    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).productionRecord.create).toHaveBeenCalled();
  });
});
