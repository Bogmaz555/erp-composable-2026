import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot } from '@nestjs/cqrs';

export class CreateSharedKernelCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class SharedKernelCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class SharedKernelAggregate extends AggregateRoot {
  constructor(private readonly aggregateId: string) {
    super();
  }
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for SharedKernel");
    const event = new SharedKernelCreatedEvent(this.aggregateId, payload);
    this.apply(event);
    return event;
  }
}

@CommandHandler(CreateSharedKernelCommand)
export class CreateSharedKernelHandler implements ICommandHandler<CreateSharedKernelCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: CreateSharedKernelCommand) {
    const aggregate = this.publisher.mergeObjectContext(new SharedKernelAggregate(command.id));
    const event = aggregate.create(command.payload);
    aggregate.commit();
    return event;
  }
}
