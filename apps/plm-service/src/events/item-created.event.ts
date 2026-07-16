export class ItemCreatedEvent {
  constructor(
    public readonly itemId: string,
    public readonly partNumber: string,
  ) {}
}
