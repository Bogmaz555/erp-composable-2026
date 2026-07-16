import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StartProductionCommand } from './start-production.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(StartProductionCommand)
export class StartProductionHandler implements ICommandHandler<StartProductionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: StartProductionCommand) {
    const existing = await this.prisma.operation.count({ where: { workOrderId: command.orderId } });
    if (existing === 0) {
      const defaults = [
        { sequence: 10, name: 'Przygotowanie stanowiska', workCenter: 'PREP', standardTimeMinutes: 30 },
        { sequence: 20, name: 'Montaż główny', workCenter: 'ASM-01', standardTimeMinutes: 120 },
        { sequence: 30, name: 'Kontrola końcowa', workCenter: 'QC', standardTimeMinutes: 45 },
      ];
      for (const d of defaults) {
        await this.prisma.operation.create({
          data: { workOrderId: command.orderId, ...d, status: 'PENDING' },
        });
      }
    }
    return this.prisma.workOrder.update({
      where: { id: command.orderId },
      data: { status: 'IN_PROGRESS' },
    });
  }
}
