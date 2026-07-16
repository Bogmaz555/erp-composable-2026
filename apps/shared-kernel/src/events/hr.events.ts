export interface HrTimeEntryRecordedV1Event {
  timeEntryId: string;
  employeeId: string;
  projectId: string;
  workOrderId?: string;
  hours: number;
  hourlyRatePln: number;
  tenantId?: string;
  recordedAt?: string;
  recordedBy?: string;
}
