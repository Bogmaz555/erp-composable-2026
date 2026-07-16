import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class CreateItemCommand {
  constructor(
    public readonly sku: string,
    public readonly name: string,
    public readonly type: 'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD',
    public readonly unit: string,
  ) {}
}

/**
 * Upraszczony wzorzec - PrismaService izolowany w module INV (Microkernel).
 */
@CommandHandler(CreateItemCommand)
export class CreateItemHandler implements ICommandHandler<CreateItemCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateItemCommand) {
    return this.prisma.item.create({
      data: {
        sku: command.sku,
        name: command.name,
        type: command.type,
        
      },
    });
  }
}
