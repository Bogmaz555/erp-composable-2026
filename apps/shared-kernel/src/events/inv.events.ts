export interface OutOfStockEvent {
  itemId: string;
  missingQuantity: number;
  projectId: string;
  wbsElementId: string;
  bomComponentId?: string;
  tenantId?: string;
  sku?: string;
}
