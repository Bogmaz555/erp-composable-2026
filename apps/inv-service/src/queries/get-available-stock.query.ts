import { IQuery } from '@nestjs/cqrs';

export class GetAvailableStockQuery implements IQuery {
  constructor(
    public readonly itemId: string,
    public readonly projectId?: string,
  ) {}
}
