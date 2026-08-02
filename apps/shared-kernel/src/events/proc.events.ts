export interface PurchaseOrderCreatedEvent {
  orderId: string;
  sku: string;
  quantity: number;
  projectId?: string;
  bomComponentId?: string;
  source?: 'SHORTAGE' | 'MRP' | 'MANUAL' | 'LONG_LEAD';
  status?: string;
  tenantId?: string;
}

export interface PurchaseOrderApprovedEvent {
  orderId: string;
  sku: string;
  quantity: number;
  projectId?: string;
  bomComponentId?: string;
  taskId?: string;
  tenantId?: string;
  source?: string;
  approvedBy?: string;
}

/** proc.material.received.v1 — goods receipt toward INV */
export interface ProcMaterialReceivedV1Event {
  purchaseOrderId: string;
  sku: string;
  quantity: number;
  unitPrice?: number;
  freightCost?: number;
  customsDuty?: number;
  landedUnitCost?: number;
  projectId?: string;
  bomComponentId?: string;
  tenantId?: string;
  lotNumber?: string;
  serialNumber?: string;
  receivedAt?: string;
  receivedBy?: string;
}

export interface ProcLongLeadDetectedEvent {
  orderId: string;
  sku: string;
  quantity: number;
  projectId: string;
  bomComponentId?: string;
  leadTimeDays: number;
  tenantId?: string;
}

/** @deprecated use PurchaseOrderCreatedEvent + proc.purchaseorder.created.v1 */
export class MaterialReceivedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly itemId: string,
    public readonly quantity: number,
    public readonly receivedAt: Date,
  ) {}
}
