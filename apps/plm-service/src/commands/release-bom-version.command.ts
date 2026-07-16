import { ICommand } from '@nestjs/cqrs';

export class ReleaseBomVersionCommand implements ICommand {
  constructor(
    public readonly bomVersionId: string,
    public readonly releasedBy: string = 'system',
  ) {}
}
