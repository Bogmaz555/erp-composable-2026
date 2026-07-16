export interface OpportunityAcceptedEvent {
  id: string;
  name: string;
  totalBudget: number;
  customerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadCreatedEvent {
  leadId: string;
  source: string;
}
