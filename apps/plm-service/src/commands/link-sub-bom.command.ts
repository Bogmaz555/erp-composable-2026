import { ICommand } from '@nestjs/cqrs';

export class LinkSubBomCommand implements ICommand {
  constructor(
    public readonly bomVersionId: string,
    public readonly componentId: string,
    public readonly subBomVersionId: string,
  ) {}
}
