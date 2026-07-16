import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { FinanceController } from '../src/finance.controller';
import { PrismaService } from '../src/prisma.service';
import { ProjectAccountingService } from '../src/project-accounting.service';

// Basic test for the new Finance WIP listener on reservation release
describe('Finance: WIP Listener on inventory.reservation.released.v1', () => {
  let controller: FinanceController;
  let commandBus: any;
  let prisma: PrismaService;

  beforeEach(async () => {
    commandBus = { execute: jest.fn().mockResolvedValue({}) };
    const mockTx = {
      projectCost: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      wipAccount: {
        upsert: jest.fn().mockResolvedValue({ id: 'wip-1' }),
      },
    };

    const mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
      projectCost: { createMany: mockTx.projectCost.createMany, findMany: mockTx.projectCost.findMany },
      wipAccount: { upsert: mockTx.wipAccount.upsert },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProjectAccountingService, useValue: {} } // Mock
      ],
    }).compile();

    controller = moduleRef.get(FinanceController);
    commandBus = moduleRef.get(CommandBus);
    prisma = moduleRef.get(PrismaService);
  });

  it('should record a WIP relief transaction when reservation is released', async () => {
    const payload = {
      workOrderId: 'wo-123',
      tenantId: 'tenant-1',
      releasedReservations: [
        { reservationId: 'r1', quantity: 5 },
        { reservationId: 'r2', quantity: 3 },
      ],
    };

    await (controller as any).handleReservationReleased(payload);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'mock-wip-account-id',
        amount: 8, // 5 + 3
        type: 'DEBIT',
        source: 'MANUFACTURING',
      })
    );

    // Real ETO ProjectCost actual costing (SILENT-51)
    expect((prisma as any).$transaction).toHaveBeenCalled();
    expect((prisma as any).projectCost.createMany).toHaveBeenCalledTimes(1);
    expect((prisma as any).projectCost.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ amount: 5 }),
          expect.objectContaining({ amount: 3 })
        ])
      })
    );

    // WipAccount update on reservation release (SILENT-54)
    // Both reservations default to wo-123, so they are aggregated into 1 upsert
    expect((prisma as any).wipAccount.upsert).toHaveBeenCalledTimes(1);
    expect((prisma as any).wipAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'wo-123' },
        update: expect.objectContaining({ wipBalance: { increment: 8 } }),
      })
    );
  });

  it('should handle user claims from NATS headers for audit (TD-001)', async () => {
    const payload = {
      workOrderId: 'wo-claim-1',
      tenantId: 'tenant-1',
      releasedReservations: [{ reservationId: 'rX', quantity: 2 }],
    };

    // Simulate context with headers (as passed by NATS in real flow)
    const mockCtx = {
      getHeaders: () => ({
        'x-user-id': 'user-prod-77',
        'x-roles': 'PRODUCTION_MANAGER,ENGINEER',
      }),
    };

    await (controller as any).handleReservationReleased(payload, mockCtx);

    expect(commandBus.execute).toHaveBeenCalled();
    // Description now includes actor when user present (see controller impl)
  });
});
