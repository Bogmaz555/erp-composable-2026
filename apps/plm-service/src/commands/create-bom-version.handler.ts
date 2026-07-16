import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBomVersionCommand } from './create-bom-version.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(CreateBomVersionCommand)
export class CreateBomVersionHandler implements ICommandHandler<CreateBomVersionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateBomVersionCommand) {
    const bomVersion = await this.prisma.bomVersion.create({
      data: {
        itemId: command.itemId,
        revision: command.revision,
        description: command.description,
        status: 'DRAFT',
        effectivityFrom: command.effectivityFrom,
        effectivityTo: command.effectivityTo,
      },
    });

    return bomVersion;
  }
}
