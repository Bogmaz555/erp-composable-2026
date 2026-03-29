import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateSalesCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class SalesCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class SalesAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Sales");
    const event = new SalesCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateSalesCommand)
export class CreateSalesHandler implements ICommandHandler<CreateSalesCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateSalesCommand) {
    const aggregate = this.publisher.mergeObjectContext(new SalesAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
