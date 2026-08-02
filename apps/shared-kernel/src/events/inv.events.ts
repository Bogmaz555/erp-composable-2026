export interface OutOfStockEvent {
  itemId: string;
  missingQuantity: number;
  projectId: string;
  wbsElementId: string;
  bomComponentId?: string;
  tenantId?: string;
  sku?: string;
}

/** inventory.reservation.created.v1 */
export interface InventoryReservationCreatedV1Event {
  reservationId: string;
  itemId: string;
  quantity: number;
  projectId?: string;
  workOrderId?: string;
  bomComponentId?: string;
  lotId?: string;
  tenantId?: string;
  createdAt?: string;
}

/** inventory.reservation.released.v1 */
export interface InventoryReservationReleasedV1Event {
  reservationId: string;
  itemId: string;
  quantity: number;
  projectId?: string;
  workOrderId?: string;
  bomComponentId?: string;
  lotId?: string;
  tenantId?: string;
  releasedAt?: string;
}

/** Optional: inventory.lot.created.v1 (emit only if Active) */
export interface InventoryLotCreatedV1Event {
  lotId: string;
  lotNumber: string;
  itemId: string;
  sku?: string;
  quantity: number;
  serialNumber?: string;
  tenantId?: string;
  purchaseOrderId?: string;
  bomComponentId?: string;
  createdAt?: string;
}
