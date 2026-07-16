import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddWbsElementCommand } from './add-wbs-element.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(AddWbsElementCommand)
export class AddWbsElementHandler implements ICommandHandler<AddWbsElementCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: AddWbsElementCommand) {
    const { projectId, name, type, parentId } = command;
    return this.prisma.isolatedClient.wbsElement.create({
      data: {
        projectId,
        name,
        type: type || 'PHASE',
        parentId: parentId || undefined,
      },
    });
  }
}
