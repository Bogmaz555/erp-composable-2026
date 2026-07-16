import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';

export class CreateInspectionCommand {
  constructor(
    public readonly referenceId: string,
    public readonly type: string,
    public readonly status?: string,
    public readonly notes?: string,
  ) {}
}

@CommandHandler(CreateInspectionCommand)
export class CreateInspectionHandler implements ICommandHandler<CreateInspectionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateInspectionCommand) {
    return this.prisma.inspection.create({
      data: {
        referenceId: command.referenceId,
        type: command.type,
        status: command.status || 'PENDING',
        notes: command.notes,
      },
    });
  }
}
