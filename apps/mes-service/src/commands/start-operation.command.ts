import { ICommand } from '@nestjs/cqrs';

export class StartOperationCommand implements ICommand {
  constructor(public readonly operationId: string) {}
}
