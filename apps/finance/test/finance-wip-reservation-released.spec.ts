import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { FinanceController } from '../src/finance.controller';
import { PrismaService } from '../src/prisma.service';

// Basic test for the new Finance WIP listener on reservation release
describe('Finance: WIP Listener on inventory.reservation.released.v1', () => {
  let controller: FinanceController;
  let commandBus: CommandBus;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      projectCost: {
        create: jest.fn().mockResolvedValue({ id: 'pc-1' }),
      },
      wipAccount: {
        upsert: jest.fn().mockResolvedValue({ id: 'wip-1' }),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [FinanceController],
      providers: [
        CommandBus,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = moduleRef.get(FinanceController);
    commandBus = moduleRef.get(CommandBus);
    prisma = moduleRef.get(PrismaService);
  });

  it('should record a WIP relief transaction when reservation is released', async () => {
    const spy = jest.spyOn(commandBus, 'execute').mockResolvedValue({});

    const payload = {
      workOrderId: 'wo-123',
      tenantId: 'tenant-1',
      releasedReservations: [
        { reservationId: 'r1', quantity: 5 },
        { reservationId: 'r2', quantity: 3 },
      ],
    };

    await (controller as any).handleReservationReleased(payload);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'mock-wip-account-id',
        amount: 8, // 5 + 3
        type: 'DEBIT',
        source: 'MANUFACTURING',
      })
    );

    // Real ETO ProjectCost actual costing (SILENT-51)
    expect((prisma as any).projectCost.create).toHaveBeenCalledTimes(2);

    // WipAccount update on reservation release (SILENT-54)
    expect((prisma as any).wipAccount.upsert).toHaveBeenCalledTimes(2);
    expect((prisma as any).wipAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'wo-123' },
        update: expect.objectContaining({ wipBalance: { increment: expect.any(Number) } }),
      })
    );
  });

  it('should handle user claims from NATS headers for audit (TD-001)', async () => {
    const spy = jest.spyOn(commandBus, 'execute').mockResolvedValue({});

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

    expect(spy).toHaveBeenCalled();
    // Description now includes actor when user present (see controller impl)
  });
});
