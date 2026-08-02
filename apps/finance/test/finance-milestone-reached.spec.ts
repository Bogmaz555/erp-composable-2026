import { MilestoneIntegrationController } from '../src/milestone-integration.controller';

describe('Finance: finance.payment.milestone.reached.v1', () => {
  it('upserts MilestoneBilling as READY and writes outbox in $transaction', async () => {
    const store = {
      milestoneBilling: { upsert: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      ...store,
      $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
    };
    const commandBus = { execute: jest.fn() };
    const controller = new MilestoneIntegrationController(prisma as any, commandBus as any);
    await controller.handleMilestoneReached({
      projectId: 'proj-1',
      milestone: 'SAT',
      amount: 100000,
      tenantId: 'default',
    } as any);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(store.milestoneBilling.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ milestone: 'SAT', status: 'READY' }),
      }),
    );
    expect(store.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'finance.payment.milestone.reached.v1',
          aggregateId: 'proj-1',
        }),
      }),
    );
  });
});
