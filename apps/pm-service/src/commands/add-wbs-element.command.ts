export class AddWbsElementCommand {
  constructor(
    public readonly projectId: string,
    public readonly name: string,
    public readonly type?: any,
    public readonly parentId?: string,
  ) {}
}
