import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateManufacturingCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class ManufacturingCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class ManufacturingAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Manufacturing");
    const event = new ManufacturingCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateManufacturingCommand)
export class CreateManufacturingHandler implements ICommandHandler<CreateManufacturingCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateManufacturingCommand) {
    const aggregate = this.publisher.mergeObjectContext(new ManufacturingAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
