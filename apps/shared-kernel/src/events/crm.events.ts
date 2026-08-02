export interface OpportunityAcceptedEvent {
  id: string;
  title: string;
  value: number; // Target Revenue
  tkw: number;   // Baseline Cost
  customerId: string;
  status: string;
  BOMItem?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadCreatedEvent {
  leadId: string;
  source: string;
}
