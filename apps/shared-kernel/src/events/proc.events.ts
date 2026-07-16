export interface PurchaseOrderCreatedEvent {
  orderId: string;
  sku: string;
  quantity: number;
  projectId?: string;
  bomComponentId?: string;
  source?: 'SHORTAGE' | 'MRP' | 'MANUAL' | 'LONG_LEAD';
  status?: string;
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
