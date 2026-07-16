export interface TaxInvoiceKsefSentV1Event {
  invoiceId: string;
  ksefReferenceNumber: string;
  projectId: string;
  milestone: string;
  amount: number;
  currency: string;
  sentAt: string;
  tenantId?: string;
}

export interface IssueKsefInvoiceRequest {
  projectId: string;
  milestone: string;
  amount: number;
  currency: string;
  buyerNip?: string;
}
