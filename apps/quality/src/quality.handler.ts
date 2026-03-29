import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateQualityCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class QualityCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class QualityAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Quality");
    return new QualityCreatedEvent(this.id, payload);
  }
}

@CommandHandler(CreateQualityCommand)
export class CreateQualityHandler implements ICommandHandler<CreateQualityCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateQualityCommand) {
    const aggregate = this.publisher.mergeObjectContext(new QualityAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
