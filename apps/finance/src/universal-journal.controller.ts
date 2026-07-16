import { Controller, Get, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { UniversalJournalService } from './universal-journal.service';

@Controller('fin/universal-journal')
export class UniversalJournalController {
  constructor(private readonly journal: UniversalJournalService) {}

  @Get()
  async list(@Query('tenantId') tenantId?: string) {
    const tid = tenantId || 'default';
    const [entries, summary] = await Promise.all([
      this.journal.list(tid),
      this.journal.summary(tid),
    ]);
    return { entries, summary };
  }

  @EventPattern('finance.wip.cost.recorded')
  async onWipCost(@Payload() data: Record<string, unknown>) {
    await this.journal.record({
      tenantId: String(data.tenantId || 'default'),
      projectId: data.projectId ? String(data.projectId) : undefined,
      wbsElementId: data.wbsElementId ? String(data.wbsElementId) : undefined,
      eventType: 'finance.wip.cost.recorded',
      sourceModule: 'FINANCE',
      amount: Number(data.amount || data.laborCost || 0),
      referenceId: data.workOrderId ? String(data.workOrderId) : undefined,
      description: 'WIP cost recorded',
    });
  }

  @EventPattern('mes.production.recorded.v1')
  async onProduction(@Payload() data: Record<string, unknown>) {
    const hours = Number(data.laborHours || data.hours || 0);
    const rate = Number(data.laborRate || 120);
    await this.journal.record({
      tenantId: String(data.tenantId || 'default'),
      projectId: data.projectId ? String(data.projectId) : undefined,
      eventType: 'mes.production.recorded.v1',
      sourceModule: 'MES',
      amount: hours * rate,
      referenceId: data.workOrderId ? String(data.workOrderId) : undefined,
      description: 'Labor micro-cost',
    });
  }
}
