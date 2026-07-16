import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class AdjustStockCommand {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
  ) {}
}

@CommandHandler(AdjustStockCommand)
export class AdjustStockHandler implements ICommandHandler<AdjustStockCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: AdjustStockCommand) {
    // Atomowa modyfikacja (upsert behavior with checks).
    const existing = await this.prisma.stockLevel.findFirst({
      where: { itemId: command.itemId },
    });

    if (existing) {
      return this.prisma.stockLevel.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + command.quantity },
      });
    } else {
      return this.prisma.stockLevel.create({
        data: {
          itemId: command.itemId,
          quantity: command.quantity,
          
        },
      });
    }
  }
}
