import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTaskCommand } from './create-task.command';
import { PrismaService } from '../prisma.service';
import { Logger } from '@nestjs/common';

@CommandHandler(CreateTaskCommand)
export class CreateTaskHandler implements ICommandHandler<CreateTaskCommand> {
  private readonly logger = new Logger(CreateTaskHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateTaskCommand) {
    this.logger.log(`Executing CreateTaskCommand for project: ${command.projectId}`);
    return this.prisma.isolatedClient.task.create({
      data: {
        project: { connect: { id: command.projectId } },
        name: command.title,
        status: 'TODO',
      },
    });
  }
}
