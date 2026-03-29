import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateInventoryCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class InventoryCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class InventoryAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Inventory");
    return new InventoryCreatedEvent(this.id, payload);
  }
}

@CommandHandler(CreateInventoryCommand)
export class CreateInventoryHandler implements ICommandHandler<CreateInventoryCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateInventoryCommand) {
    const aggregate = this.publisher.mergeObjectContext(new InventoryAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
