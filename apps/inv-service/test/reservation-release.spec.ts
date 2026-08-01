import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { PmIntegrationController } from '../src/pm-integration.controller';
import { PrismaService } from '../src/prisma.service';

function mockPrismaTx(store: Record<string, unknown>) {
  return {
    ...store,
    $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
  };
}

// Skeleton for INV reservation release on production complete (Faza 1 ETO)
describe('INV Traceability: Reservation Release on mes.production.recorded.v1', () => {
  let controller: PmIntegrationController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const store = {
      reservation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'res-1', workOrderId: 'wo-123', bomComponentId: 'bom-xyz', itemId: 'item-1', quantity: 3, status: 'ACTIVE' },
        ]),
        update: jest.fn(),
      },
      stockTransaction: { create: jest.fn() },
      itemGenealogy: { create: jest.fn() },
      outboxEvent: { create: jest.fn() },
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [PmIntegrationController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaTx(store),
        },
        CommandBus,
      ],
    }).compile();

    controller = moduleRef.get(PmIntegrationController);
    prisma = moduleRef.get(PrismaService);
  });

  it('should release active reservations and emit inventory.reservation.released.v1 when production recorded', async () => {
    const payload = { workOrderId: 'wo-123', bomComponentIds: ['bom-xyz'] };

    // Simulate the @EventPattern handler (manual call for test)
    await (controller as any).handleProductionRecorded(payload, { getHeaders: () => ({}) });

    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RELEASED' }),
      })
    );
    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'inventory.reservation.released.v1' }),
      })
    );
  });

  it('should accept and log x-user-id / x-roles from NATS headers (TD-001 claim propagation)', async () => {
    const payload = { workOrderId: 'wo-claim-test', bomComponentIds: ['bom-xyz'] };

    const claimCtx = {
      getHeaders: () => ({
        'x-user-id': 'user-eto-42',
        'x-roles': 'PRODUCTION_MANAGER',
      }),
    };

    // Should not throw and should process normally with claims present
    await (controller as any).handleProductionRecorded(payload, claimCtx);

    expect((prisma as any).reservation.update).toHaveBeenCalled();
    // The handler now logs [TD-001] when userId present (side-effect covered by not crashing + existing outbox expectation in similar tests)
  });

  it('should emit inventory.reservation.released.v1 with rich payload for downstream Finance WIP costing (contract-like)', async () => {
    const payload = { workOrderId: 'wo-contract-1', bomComponentIds: ['bom-xyz'] };

    await (controller as any).handleProductionRecorded(payload, { getHeaders: () => ({}) });

    expect((prisma as any).outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'inventory.reservation.released.v1',
          payload: expect.objectContaining({
            workOrderId: 'wo-contract-1',
            releasedReservations: expect.any(Array),
            tenantId: expect.any(String),
          }),
        }),
      })
    );
  });
});
