import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  assertValidEventPayload,
  isEnterpriseProfile,
} from '@erp/shared-kernel';
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

    const payload = {
      projectId: project.id,
      projectName: project.name,
      wbsElementId: null as string | null,
      productName: project.name,
      quantity: 1,
      tenantId: project.tenantId || 'default',
    };

    if (isEnterpriseProfile()) {
      assertValidEventPayload('pm.project.released.v1', payload);
    }

    await this.prisma.isolatedClient.outboxEvent.create({
      data: {
        id: require('crypto').randomUUID(),
        aggregateId: project.id,
        aggregateType: 'Project',
        eventType: 'pm.project.released.v1',
        payload,
        status: OutboxStatus.PENDING,
      },
    });

    await this.prisma.isolatedClient.project.update({
      where: { id: project.id },
      data: { status: 'RELEASED' },
    });

    return { success: true, message: 'Project released to manufacturing' };
  }
}
