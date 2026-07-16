export interface QualityNcrRaisedV1Event {
  ncrId: string;
  inspectionId: string;
  defectDescription: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: string;
  projectId?: string;
  workOrderId?: string;
  bomComponentId?: string;
  tenantId?: string;
  raisedAt: string;
}

export interface QualityNcrClosedV1Event {
  ncrId: string;
  disposition: string;
  closedBy?: string;
  closedAt: string;
  projectId?: string;
}

export interface QualityCapaCreatedV1Event {
  capaId: string;
  ncrId: string;
  type: 'CORRECTIVE' | 'PREVENTIVE' | string;
  assignee?: string;
  dueDate?: string;
  status: string;
}

export interface QualityCapaVerifiedV1Event {
  capaId: string;
  ncrId: string;
  verifiedAt: string;
}
