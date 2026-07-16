import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CreateItemCommand } from './create-item.command';
import { PrismaService } from '../prisma.service';
import { ItemCreatedEvent } from '../events/item-created.event'; // to be created

@CommandHandler(CreateItemCommand)
export class CreateItemHandler implements ICommandHandler<CreateItemCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateItemCommand) {
    const item = await this.prisma.item.create({
      data: {
        partNumber: command.partNumber,
        name: command.name,
        description: command.description,
        type: command.type as any,
        unitOfMeasure: command.unitOfMeasure,
        attributes: command.attributes || {},
      },
    });

    // Emit event (will use Outbox in production version)
    this.eventBus.publish(new ItemCreatedEvent(item.id, item.partNumber));

    return item;
  }
}
