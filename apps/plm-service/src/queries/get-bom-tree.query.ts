import { IQuery } from '@nestjs/cqrs';

export class GetBomTreeQuery implements IQuery {
  constructor(
    public readonly bomVersionId: string,
    public readonly includeEffectivity: boolean = true,
  ) {}
}
