export class RecordTimeEntryCommand {
  constructor(
    public readonly employeeId: string,
    public readonly projectId: string,
    public readonly hours: number,
    public readonly workOrderId?: string,
    public readonly tenantId?: string,
  ) {}
}
