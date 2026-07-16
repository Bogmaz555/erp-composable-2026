import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FinishProductionCommand } from './finish-production.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(FinishProductionCommand)
export class FinishProductionHandler implements ICommandHandler<FinishProductionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: FinishProductionCommand) {
    return this.prisma.workOrder.update({
      where: { id: command.orderId },
      data: { status: 'COMPLETED' },
    });
  }
}
