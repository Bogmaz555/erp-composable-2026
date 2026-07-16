export class BomReleasedEvent {
  constructor(
    public readonly bomVersionId: string,
    public readonly itemId: string,
    public readonly revision: string,
    public readonly components: any[],
    public readonly releasedAt: Date,
    public readonly releasedBy: string,
  ) {}
}
