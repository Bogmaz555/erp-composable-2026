import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateHrCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class HrCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class HrAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Hr");
    const event = new HrCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateHrCommand)
export class CreateHrHandler implements ICommandHandler<CreateHrCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateHrCommand) {
    const aggregate = this.publisher.mergeObjectContext(new HrAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
