import { ICommand } from '@nestjs/cqrs';

export class CreateItemCommand implements ICommand {
  constructor(
    public readonly partNumber: string,
    public readonly name: string,
    public readonly description?: string,
    public readonly type: string = 'PART',
    public readonly unitOfMeasure: string = 'szt',
    public readonly attributes?: any
  ) {}
}
