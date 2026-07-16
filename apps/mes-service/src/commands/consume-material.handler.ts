import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConsumeMaterialCommand } from './consume-material.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(ConsumeMaterialCommand)
export class ConsumeMaterialHandler implements ICommandHandler<ConsumeMaterialCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ConsumeMaterialCommand) {
    return this.prisma.materialConsumption.create({
      data: {
        tenantId: 'default',
        workOrderId: command.workOrderId,
        bomComponentId: command.bomComponentId || null,
        itemId: command.itemId,
        lotId: command.lotId,
        quantity: command.quantity,
      },
    });
  }
}
