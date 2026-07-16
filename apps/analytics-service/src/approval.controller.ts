import { Controller, Get, Post, Patch, Param, Body, Query, Headers } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { PlatformService } from './platform.service';
import { resolveTenantId } from './tenant.util';
import { MailerService } from './mailer.service';

@Controller()
export class ApprovalController {
  constructor(
    private readonly approvals: ApprovalService,
    private readonly platform: PlatformService,
    private readonly mailer: MailerService,
  ) {}

  @Get('approvals')
  list(
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    @Headers() headers?: Record<string, string | string[] | undefined>,
  ) {
    const tenantId = resolveTenantId(headers ?? {});
    return this.approvals.list(status, tenantId);
  }

  @Post('approvals')
  create(
    @Body() body: {
      module: string; entityType: string; entityId: string;
      title: string; description?: string; requestedBy: string; requiredRole: string;
    },
    @Headers() headers?: Record<string, string | string[] | undefined>,
  ) {
    const tenantId = resolveTenantId(headers ?? {});
    return this.approvals.create({ tenantId, ...body });
  }

  @Patch('approvals/:id/approve')
  approve(
    @Param('id') id: string,
    @Body() body?: { resolvedBy?: string },
    @Headers() headers?: Record<string, string | string[] | undefined>,
  ) {
    const tenantId = resolveTenantId(headers ?? {});
    const result = this.approvals.resolve(id, 'APPROVED', body?.resolvedBy ?? 'approver');
    this.platform.recordEvent('approval.approved', 'platform', {
      id, title: result.title, resolvedBy: result.resolvedBy, tenantId,
    });
    this.mailer.notifyApproval('APPROVED', result.title, result.resolvedBy ?? 'approver', tenantId).catch(() => {});
    return result;
  }

  @Patch('approvals/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() body?: { resolvedBy?: string },
    @Headers() headers?: Record<string, string | string[] | undefined>,
  ) {
    const tenantId = resolveTenantId(headers ?? {});
    const result = this.approvals.resolve(id, 'REJECTED', body?.resolvedBy ?? 'approver');
    this.platform.recordEvent('approval.rejected', 'platform', {
      id, title: result.title, resolvedBy: result.resolvedBy, tenantId,
    });
    this.mailer.notifyApproval('REJECTED', result.title, result.resolvedBy ?? 'approver', tenantId).catch(() => {});
    return result;
  }
}
