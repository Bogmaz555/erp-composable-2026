import type { MilestoneType } from '@erp/shared-kernel';

export class ReachProjectMilestoneCommand {
  constructor(
    public readonly projectId: string,
    public readonly milestone: MilestoneType,
    public readonly amount: number,
    public readonly percent?: number,
    public readonly tenantId?: string,
    public readonly reachedBy?: string,
  ) {}
}
