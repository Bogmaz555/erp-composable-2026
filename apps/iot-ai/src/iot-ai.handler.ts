import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateIotAiCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class IotAiCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class IotAiAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for IotAi");
    return new IotAiCreatedEvent(this.id, payload);
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
