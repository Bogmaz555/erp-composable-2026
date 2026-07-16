export class GetGenealogyForwardQuery {
  constructor(
    public readonly parentSerialOrLot: string,
    public readonly tenantId?: string,
  ) {}
}
