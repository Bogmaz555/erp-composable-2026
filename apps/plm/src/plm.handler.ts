import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreatePlmCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class PlmCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class PlmAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Plm");
    const event = new PlmCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreatePlmCommand)
export class CreatePlmHandler implements ICommandHandler<CreatePlmCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreatePlmCommand) {
    const aggregate = this.publisher.mergeObjectContext(new PlmAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
