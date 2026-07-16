export interface MaterialRequestedEvent {
  projectId: string;
  wbsElementId: string;
  itemId: string;
  requestedQuantity: number;
  bomComponentId?: string;
  tenantId?: string;
}

export interface ProjectReleasedEvent {
  projectId: string;
  projectName: string;
  wbsElementId?: string;
  productName: string;
  quantity: number;
}
