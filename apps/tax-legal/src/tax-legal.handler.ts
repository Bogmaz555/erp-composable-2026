import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateTaxLegalCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class TaxLegalCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class TaxLegalAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for TaxLegal");
    const event = new TaxLegalCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateTaxLegalCommand)
export class CreateTaxLegalHandler implements ICommandHandler<CreateTaxLegalCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateTaxLegalCommand) {
    const aggregate = this.publisher.mergeObjectContext(new TaxLegalAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
