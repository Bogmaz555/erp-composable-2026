import { ICommand } from '@nestjs/cqrs';

export class AddBomComponentCommand implements ICommand {
  constructor(
    public readonly bomVersionId: string,
    public readonly childItemId: string,
    public readonly quantity: number,
    public readonly position?: number,
    public readonly scrapFactor: number = 0,
  ) {}
}
