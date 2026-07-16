export class CreateProjectFromOpportunityCommand {
  constructor(
    public readonly opportunityId: string,
    public readonly name: string,
    public readonly totalBudget: number,
  ) {}
}
