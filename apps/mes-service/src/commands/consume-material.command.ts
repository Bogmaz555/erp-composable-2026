import { ICommand } from '@nestjs/cqrs';

export class ConsumeMaterialCommand implements ICommand {
  constructor(
    public readonly workOrderId: string,
    public readonly itemId: string,
    public readonly lotId?: string,
    public readonly quantity: number = 0,
    public readonly bomComponentId?: string,  // for full ETO genealogy traceability
  ) {}
}
