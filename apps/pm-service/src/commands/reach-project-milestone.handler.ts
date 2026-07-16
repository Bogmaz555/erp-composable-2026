import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReachProjectMilestoneCommand } from './reach-project-milestone.command';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '.prisma/client-pm';

@CommandHandler(ReachProjectMilestoneCommand)
export class ReachProjectMilestoneHandler implements ICommandHandler<ReachProjectMilestoneCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReachProjectMilestoneCommand) {
    const project = await this.prisma.isolatedClient.project.findUnique({
      where: { id: command.projectId },
    });
    if (!project) throw new Error('Project not found');

    const tenantId = command.tenantId || 'default';

    await this.prisma.isolatedClient.outboxEvent.create({
      data: {
        id: require('crypto').randomUUID(),
        tenantId,
        aggregateId: project.id,
        aggregateType: 'Project',
        eventType: 'finance.payment.milestone.reached.v1',
        payload: {
          projectId: project.id,
          tenantId,
          milestone: command.milestone,
          amount: command.amount,
          percent: command.percent,
          currency: 'PLN',
          reachedAt: new Date().toISOString(),
          reachedBy: command.reachedBy || 'pm-system',
        },
        status: OutboxStatus.PENDING,
      },
    });

    return {
      success: true,
      milestone: command.milestone,
      event: 'finance.payment.milestone.reached.v1',
    };
  }
}
