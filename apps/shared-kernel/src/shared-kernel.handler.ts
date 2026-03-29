import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

export class CreateSharedKernelCommand {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class SharedKernelCreatedEvent {
  constructor(public readonly id: string, public readonly payload: any) {}
}

export class SharedKernelAggregate {
  constructor(private readonly id: string) {}
  create(payload: any) {
    // DOMAIN LOGIC: Verify business rule
    if (!payload) throw new Error("Invalid Payload for SharedKernel");
    return new SharedKernelCreatedEvent(this.id, payload);
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
