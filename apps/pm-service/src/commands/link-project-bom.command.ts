export class LinkProjectBomCommand {
  constructor(
    public readonly projectId: string,
    public readonly bomVersionId: string,
    public readonly tenantId?: string,
  ) {}
}
