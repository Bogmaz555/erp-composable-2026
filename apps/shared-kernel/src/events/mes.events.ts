export class WorkOrderCompletedEvent {
  constructor(
    public readonly workOrderId: string,
    public readonly completedAt: Date,
  ) {}
}

export class ProductionRecordedEvent {
  constructor(
    public readonly workOrderId: string,
    public readonly quantityGood: number,
    public readonly quantityScrap: number,
    public readonly recordedAt: Date,
  ) {}
}

/** Canonical NATS payload shape for mes.production.recorded.v1 */
export interface MesProductionRecordedV1Event {
  workOrderId: string;
  projectId?: string;
  tenantId?: string;
  quantityGood: number;
  quantityScrap?: number;
  operatorId?: string;
  laborHours?: number;
  bomComponentIds?: string[];
  recordedAt?: string;
}

export class MaterialConsumedEvent {
  constructor(
    public readonly workOrderId: string,
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly lotId?: string,
  ) {}
}
