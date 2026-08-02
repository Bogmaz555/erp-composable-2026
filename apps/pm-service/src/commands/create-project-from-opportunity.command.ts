export class CreateProjectFromOpportunityCommand {
  constructor(
    public readonly opportunityId: string,
    public readonly name: string,
    public readonly targetRevenue: number,
    public readonly baselineCost: number,
    public readonly bomItems: any[],
  ) {}
}
