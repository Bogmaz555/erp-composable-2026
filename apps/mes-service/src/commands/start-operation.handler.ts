import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StartOperationCommand } from './start-operation.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(StartOperationCommand)
export class StartOperationHandler implements ICommandHandler<StartOperationCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: StartOperationCommand) {
    return this.prisma.operation.update({
      where: { id: command.operationId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }
}
