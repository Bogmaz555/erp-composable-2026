import { ReachProjectMilestoneHandler } from './reach-project-milestone.handler';
import { ReachProjectMilestoneCommand } from './reach-project-milestone.command';

describe('ReachProjectMilestoneHandler', () => {
  it('emits finance.payment.milestone.reached.v1 to outbox', async () => {
    const prisma = {
      isolatedClient: {
        project: { findUnique: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Machine A' }) },
        outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      },
    };
    const handler = new ReachProjectMilestoneHandler(prisma as any);
    const result = await handler.execute(
      new ReachProjectMilestoneCommand('proj-1', 'FAT', 250000, 30),
    );

    expect(prisma.isolatedClient.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'finance.payment.milestone.reached.v1',
          payload: expect.objectContaining({ milestone: 'FAT', amount: 250000 }),
        }),
      }),
    );
    expect(result.milestone).toBe('FAT');
  });
});
