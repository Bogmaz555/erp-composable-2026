import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CompleteOperationCommand } from './complete-operation.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(CompleteOperationCommand)
export class CompleteOperationHandler implements ICommandHandler<CompleteOperationCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CompleteOperationCommand) {
    return this.prisma.operation.update({
      where: { id: command.operationId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }
}
