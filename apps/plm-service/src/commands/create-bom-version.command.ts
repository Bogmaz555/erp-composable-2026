import { ICommand } from '@nestjs/cqrs';

export class CreateBomVersionCommand implements ICommand {
  constructor(
    public readonly itemId: string,
    public readonly revision: string,
    public readonly description?: string,
    public readonly effectivityFrom?: Date,
    public readonly effectivityTo?: Date,
  ) {}
}
