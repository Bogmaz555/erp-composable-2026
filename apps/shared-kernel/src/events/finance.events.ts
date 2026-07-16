/** Finance bounded context — milestone & project accounting events */

export type MilestoneType = 'FAT' | 'SAT' | 'SHIPMENT' | 'FINAL' | 'PREPAYMENT';

export interface FinanceRevenueRecognizedV1Event {
  projectId: string;
  milestone: string;
  amount: number;
  currency: string;
  ksefReferenceNumber: string;
  tenantId?: string;
  recognizedAt: string;
}

export interface FinancePaymentMilestoneReachedV1Event {
  projectId: string;
  tenantId?: string;
  milestone: MilestoneType;
  amount: number;
  currency?: string;
  percent?: number;
  reachedAt?: string;
  reachedBy?: string;
  opportunityId?: string;
}
