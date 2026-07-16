import { ProjectAccountingService } from '../src/project-accounting.service';
import { MilestoneIntegrationController } from '../src/milestone-integration.controller';

describe('Finance: finance.payment.milestone.reached.v1', () => {
  it('upserts MilestoneBilling as READY', async () => {
    const prisma = {
      milestoneBilling: { upsert: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const commandBus = { execute: jest.fn() };
    const controller = new MilestoneIntegrationController(prisma as any, commandBus as any);
    await controller.handleMilestoneReached({
      projectId: 'proj-1',
      milestone: 'SAT',
      amount: 100000,
      tenantId: 'default',
    });

    expect(prisma.milestoneBilling.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ milestone: 'SAT', status: 'READY' }),
      }),
    );
  });
});
