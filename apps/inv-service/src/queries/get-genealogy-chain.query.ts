export class GetGenealogyChainQuery {
  constructor(
    public readonly parentSerialOrLot: string,
    public readonly tenantId?: string,
  ) {}
}
