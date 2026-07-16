import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddBomComponentCommand } from './add-bom-component.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(AddBomComponentCommand)
export class AddBomComponentHandler implements ICommandHandler<AddBomComponentCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: AddBomComponentCommand) {
    // Basic cycle detection (simplified for now)
    const existing = await this.prisma.bomComponent.findFirst({
      where: {
        bomVersionId: command.bomVersionId,
        childItemId: command.childItemId,
      },
    });

    if (existing) {
      throw new Error('Component already exists in this BOM version');
    }

    const component = await this.prisma.bomComponent.create({
      data: {
        bomVersionId: command.bomVersionId,
        childItemId: command.childItemId,
        parentItemId: (await this.prisma.bomVersion.findUnique({
          where: { id: command.bomVersionId },
          select: { itemId: true },
        }))!.itemId,
        quantity: command.quantity,
        position: command.position,
        scrapFactor: command.scrapFactor,
      },
    });

    return component;
  }
}
