import { ICommand } from '@nestjs/cqrs';

export class CreateReservationCommand implements ICommand {
  constructor(
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly projectId?: string,
    public readonly workOrderId?: string,
    public readonly lotId?: string,
    public readonly bomComponentId?: string,   // for exact ETO traceability link to PLM BomComponent
    public readonly tenantId?: string,
    public readonly createdBy?: string,
  ) {}
}
