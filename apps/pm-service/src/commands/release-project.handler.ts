import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '.prisma/client-pm';

export class ReleaseProjectCommand {
  constructor(public readonly projectId: string) {}
}

@CommandHandler(ReleaseProjectCommand)
export class ReleaseProjectHandler implements ICommandHandler<ReleaseProjectCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReleaseProjectCommand) {
    const project = await this.prisma.isolatedClient.project.findUnique({
      where: { id: command.projectId },
    });

    if (!project) throw new Error('Project not found');

    // Domain write + outbox in one TX (never orphan RELEASED without outbox row)
    await this.prisma.isolatedClient.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: { status: 'RELEASED' },
      });

      await tx.outboxEvent.create({
        data: {
          id: require('crypto').randomUUID(),
          tenantId: project.tenantId || 'default',
          aggregateId: project.id,
          aggregateType: 'Project',
          eventType: 'pm.project.released.v1',
          payload: {
            projectId: project.id,
            projectName: project.name,
            wbsElementId: null,
            productName: project.name,
            quantity: 1,
            tenantId: project.tenantId || 'default',
          },
          status: OutboxStatus.PENDING,
        },
      });
    });

    return { success: true, message: 'Project released to manufacturing' };
  }
}
