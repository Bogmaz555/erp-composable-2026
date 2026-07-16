export interface EamMaintenanceScheduledV1Event {
  taskId: string;
  equipmentId: string;
  type: string;
  scheduledDate: string;
  description: string;
}

export interface EamBreakdownDetectedV1Event {
  equipmentId: string;
  reason: string;
  severity: string;
  detectedAt: string;
  projectId?: string;
}
