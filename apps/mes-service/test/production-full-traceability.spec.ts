import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { RecordProductionHandler } from '../src/commands/record-production.handler';
import { RecordProductionCommand } from '../src/commands/record-production.command';
import { PrismaService } from '../src/prisma.service';

// Test for full ETO traceability during production recording (bomComponentId + AsBuilt + events)
describe('MES: Full Production Traceability (bomComponentId + AsBuilt + Events)', () => {
  let handler: RecordProductionHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        RecordProductionHandler,
        {
          provide: PrismaService,
          useValue: {
            productionRecord: { create: jest.fn() },
            materialRequirement: { findMany: jest.fn().mockResolvedValue([]) },
            asBuiltRecord: { create: jest.fn() },
            outboxEvent: { create: jest.fn() },
            workOrder: {
              findUnique: jest.fn().mockResolvedValue({
                projectId: 'proj-eto-1',
                tenantId: 'default',
              }),
            },
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(RecordProductionHandler);
    prisma = moduleRef.get(PrismaService);
  });

  it('should create AsBuilt and emit production event even with no requirements', async () => {
    const command = new RecordProductionCommand('wo-full-trace', 2, 0, 'op-1');

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect((prisma as any).asBuiltRecord.create).toHaveBeenCalled();
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'mes.production.recorded.v1' })
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
        eventType: 'mes.production.recorded.v1',
        payload: expect.objectContaining({
          workOrderId: 'wo-eto-spine-1',
          bomComponentIds: expect.arrayContaining(['bom-comp-uuid-1', 'bom-comp-uuid-2']),
          operatorId: 'op-auth-user',
          laborHours: 6,
          projectId: 'proj-eto-1',
        }),
      })
    );

    // Note: In real authenticated flow (via WorkOrdersController + Jwt + NATS), x-user-id/x-roles
    // are propagated in headers. INV pm-integration and Finance WIP listeners now extract them
    // for full audit trail on the bomComponentId chain (TD-001). operatorId here comes from the
    // authenticated user at the controller layer.
  });
});
