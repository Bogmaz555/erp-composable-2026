import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreatePlmCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class PlmCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class PlmAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Plm");
    return new PlmCreatedEvent(this.id, payload);
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
