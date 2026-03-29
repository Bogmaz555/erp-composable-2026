import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateManufacturingCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class ManufacturingCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class ManufacturingAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Manufacturing");
    return new ManufacturingCreatedEvent(this.id, payload);
  }
}

@CommandHandler(CreateManufacturingCommand)
export class CreateManufacturingHandler implements ICommandHandler<CreateManufacturingCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateManufacturingCommand) {
    const aggregate = this.publisher.mergeObjectContext(new ManufacturingAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
