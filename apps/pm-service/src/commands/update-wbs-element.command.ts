export class UpdateWbsElementCommand {
  constructor(
    public readonly id: string,
    public readonly updates: any,
  ) {}
}
