import { ICommand } from '@nestjs/cqrs';

export class RecordProductionCommand implements ICommand {
  constructor(
    public readonly workOrderId: string,
    public readonly quantityGood: number,
    public readonly quantityScrap: number = 0,
    public readonly operatorId?: string,
    /** Labor hours for Finance LABOR/OVERHEAD costing (ETO) */
    public readonly laborHours: number = 0,
  ) {}
}
