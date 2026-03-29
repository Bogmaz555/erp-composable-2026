import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateEamCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class EamCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class EamAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Eam");
    return new EamCreatedEvent(this.id, payload);
  }
}

@CommandHandler(CreateEamCommand)
export class CreateEamHandler implements ICommandHandler<CreateEamCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateEamCommand) {
    const aggregate = this.publisher.mergeObjectContext(new EamAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
