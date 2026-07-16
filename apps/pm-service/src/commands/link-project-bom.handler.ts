import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LinkProjectBomCommand } from './link-project-bom.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(LinkProjectBomCommand)
export class LinkProjectBomHandler implements ICommandHandler<LinkProjectBomCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: LinkProjectBomCommand) {
    const project = await this.prisma.isolatedClient.project.update({
      where: { id: command.projectId },
      data: { bomVersionId: command.bomVersionId },
    });
    return project;
  }
}
