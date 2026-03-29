import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateAnalyticsCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class AnalyticsCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class AnalyticsAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Analytics");
    const event = new AnalyticsCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateAnalyticsCommand)
export class CreateAnalyticsHandler implements ICommandHandler<CreateAnalyticsCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateAnalyticsCommand) {
    const aggregate = this.publisher.mergeObjectContext(new AnalyticsAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
