import { Controller, Post, Param, Body } from '@nestjs/common';
import { ApprovalsServiceService } from './approvals-service.service';

@Controller('approvals')
export class ApprovalsServiceController {
  constructor(private readonly approvalsService: ApprovalsServiceService) {}

  @Post('request')
  async requestApproval(@Body() body: { entityId: string; entityType: string }) {
    const runId = await this.approvalsService.startApproval(body.entityId, body.entityType);
    return { status: 'PENDING', runId };
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    await this.approvalsService.signalApproval(id, 'approve');
    return { status: 'APPROVED' };
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    await this.approvalsService.signalApproval(id, 'reject');
    return { status: 'REJECTED' };
  }
}
