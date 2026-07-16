import { OpportunityStatus } from '.prisma/client-crm';

export class UpdatePipelineStageCommand {
  constructor(
    public readonly id: string,
    public readonly status: OpportunityStatus,
  ) {}
}
