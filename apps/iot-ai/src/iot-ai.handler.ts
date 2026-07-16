import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateIotAiCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class IotAiCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class IotAiAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for IotAi");
    const event = new IotAiCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateIotAiCommand)
export class CreateIotAiHandler implements ICommandHandler<CreateIotAiCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateIotAiCommand) {
    const aggregate = this.publisher.mergeObjectContext(new IotAiAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
