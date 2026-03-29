import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateAnalyticsCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class AnalyticsCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class AnalyticsAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Analytics");
    return new AnalyticsCreatedEvent(this.id, payload);
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
