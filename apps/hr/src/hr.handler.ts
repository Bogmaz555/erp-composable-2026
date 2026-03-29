import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateHrCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class HrCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class HrAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Hr");
    return new HrCreatedEvent(this.id, payload);
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
