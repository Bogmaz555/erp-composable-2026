import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateWbsElementCommand } from './update-wbs-element.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(UpdateWbsElementCommand)
export class UpdateWbsElementHandler implements ICommandHandler<UpdateWbsElementCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateWbsElementCommand) {
    const { id, updates } = command;
    // ensure date strings are parsed if needed, but Prisma handles Date seamlessly if typings match or frontend sends ISO string
    return this.prisma.isolatedClient.wbsElement.update({
      where: { id },
      data: updates,
    });
  }
}
