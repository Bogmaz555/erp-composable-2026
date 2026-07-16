export class GetGenealogyBackwardQuery {
  constructor(
    public readonly childLotId?: string,
    public readonly bomComponentId?: string,
    public readonly tenantId?: string,
  ) {}
}
