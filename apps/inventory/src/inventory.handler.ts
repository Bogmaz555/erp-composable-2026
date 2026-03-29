import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateInventoryCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class InventoryCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class InventoryAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Inventory");
    const event = new InventoryCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
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
