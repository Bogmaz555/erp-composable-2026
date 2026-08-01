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

// Test for full ETO traceability during production recording (bomComponentId + AsBuilt + events)
describe('MES: Full Production Traceability (bomComponentId + AsBuilt + Events)', () => {
  let handler: RecordProductionHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const store = {
      productionRecord: {
        create: jest.fn().mockResolvedValue({ id: 'pr-full', workOrderId: 'wo-full-trace' }),
      },
      materialRequirement: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      asBuiltRecord: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      workOrder: {
        findUnique: jest.fn().mockResolvedValue({
          projectId: 'proj-eto-1',
          tenantId: 'default',
        }),
      },
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

  it('should create AsBuilt and emit production event even with no requirements', async () => {
    const command = new RecordProductionCommand('wo-full-trace', 2, 0, 'op-1');

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).asBuiltRecord.create).toHaveBeenCalled();
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'mes.production.recorded.v1' }),
      }),
    );
  });

  it('should emit mes.production.recorded.v1 with bomComponentIds for full ETO spine (INV reservation release + Finance WIP)', async () => {
    // Rich mock: requirements with bomComponentId (the spine key for downstream INV + Finance)
    (prisma as any).materialRequirement.findMany = jest.fn().mockResolvedValue([
      { id: 'req-1', itemId: 'item-a', quantity: 5, bomComponentId: 'bom-comp-uuid-1', reservedQty: 5 },
      { id: 'req-2', itemId: 'item-b', quantity: 3, bomComponentId: 'bom-comp-uuid-2', reservedQty: 3 },
    ]);

    const command = new RecordProductionCommand('wo-eto-spine-1', 4, 0, 'op-auth-user', 6);

    await handler.execute(command);

    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'mes.production.recorded.v1',
          payload: expect.objectContaining({
            workOrderId: 'wo-eto-spine-1',
            bomComponentIds: expect.arrayContaining(['bom-comp-uuid-1', 'bom-comp-uuid-2']),
            operatorId: 'op-auth-user',
            laborHours: 6,
            projectId: 'proj-eto-1',
          }),
        }),
      }),
    );

    // Note: In real authenticated flow (via WorkOrdersController + Jwt + NATS), x-user-id/x-roles
    // are propagated in headers. INV pm-integration and Finance WIP listeners now extract them
    // for full audit trail on the bomComponentId chain (TD-001). operatorId here comes from the
    // authenticated user at the controller layer.
  });
});
