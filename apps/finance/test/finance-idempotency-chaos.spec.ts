import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { FinanceController } from '../src/finance.controller';
import { PrismaService } from '../src/prisma.service';
import { ProjectAccountingService } from '../src/project-accounting.service';

describe('Finance: Idempotency & Chaos Engineering', () => {
  let controller: FinanceController;
  let commandBus: any;
  let prisma: PrismaService;

  beforeEach(async () => {
    commandBus = { execute: jest.fn().mockResolvedValue({}) };
    const mockTx = {
      projectCost: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]), // no existing costs
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
        { provide: ProjectAccountingService, useValue: {} },
      ],
    }).compile();

    controller = moduleRef.get(FinanceController);
    commandBus = moduleRef.get(CommandBus);
    prisma = moduleRef.get(PrismaService);
  });

  it('should guarantee Idempotency (skip already processed reservations)', async () => {
    // Simulate that 'r1' is already in the database
    const mockTx = {
      projectCost: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([{ reference: 'r1' }]), // r1 is processed!
      },
      wipAccount: {
        upsert: jest.fn().mockResolvedValue({ id: 'wip-1' }),
      },
    };
    (prisma as any).$transaction.mockImplementation(async (cb: any) => cb(mockTx));

    const payload = {
      workOrderId: 'wo-123',
      tenantId: 'tenant-1',
      releasedReservations: [
        { reservationId: 'r1', quantity: 5 }, // already processed
        { reservationId: 'r2', quantity: 3 }, // new
      ],
    };

    await (controller as any).handleReservationReleased(payload);

    // Only 'r2' should be processed
    expect(mockTx.wipAccount.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.wipAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ wipBalance: { increment: 3 } }), // Only 3, not 8!
      })
    );
  });

  it('should NOT swallow DB errors (Chaos Engineering)', async () => {
    // Simulate DB connection drop during transaction
    (prisma as any).$transaction.mockRejectedValue(new Error('PrismaClientInitializationError: DB Gone'));

    const payload = {
      workOrderId: 'wo-chaos-1',
      tenantId: 'tenant-1',
      releasedReservations: [{ reservationId: 'r-chaos', quantity: 10 }],
    };

    // The error should bubble up, which triggers NATS Nack and Retry/DLQ
    await expect((controller as any).handleReservationReleased(payload))
      .rejects.toThrow('PrismaClientInitializationError: DB Gone');
  });
});
