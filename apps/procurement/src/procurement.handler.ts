import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateProcurementCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class ProcurementCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class ProcurementAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for Procurement");
    const event = new ProcurementCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateProcurementCommand)
export class CreateProcurementHandler implements ICommandHandler<CreateProcurementCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateProcurementCommand) {
    const aggregate = this.publisher.mergeObjectContext(new ProcurementAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
