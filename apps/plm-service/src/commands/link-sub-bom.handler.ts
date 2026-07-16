import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LinkSubBomCommand } from './link-sub-bom.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(LinkSubBomCommand)
export class LinkSubBomHandler implements ICommandHandler<LinkSubBomCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: LinkSubBomCommand) {
    const comp = await this.prisma.bomComponent.findFirst({
      where: { id: command.componentId, bomVersionId: command.bomVersionId },
    });
    if (!comp) throw new Error('BOM component not found');

    const sub = await this.prisma.bomVersion.findUnique({
      where: { id: command.subBomVersionId },
    });
    if (!sub) throw new Error('Sub BOM version not found');
    if (sub.itemId !== comp.childItemId) {
      throw new Error('Sub BOM must belong to the component child item');
    }

    return this.prisma.bomComponent.update({
      where: { id: command.componentId },
      data: { subBomVersionId: command.subBomVersionId },
      include: { childItem: true, subBomVersion: true },
    });
  }
}
