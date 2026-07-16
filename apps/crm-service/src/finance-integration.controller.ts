import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type {
  FinancePaymentMilestoneReachedV1Event,
  TaxInvoiceKsefSentV1Event,
} from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

type MilestoneRow = {
  id?: string;
  phase?: string;
  milestone?: string;
  percentage?: number;
  status?: string;
  ksefRef?: string;
  amount?: number;
  invoicedAt?: string;
};

@Controller()
export class FinanceIntegrationController {
  private readonly logger = new Logger(FinanceIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('finance.payment.milestone.reached.v1')
  async onMilestoneReached(@Payload() data: FinancePaymentMilestoneReachedV1Event) {
    await this.syncOpportunityMilestones(data.projectId, data.milestone, 'READY', {
      amount: data.amount,
    });
    this.logger.log(`[CRM] Milestone ${data.milestone} READY for project ${data.projectId}`);
  }

  @EventPattern('tax.invoice.ksef.sent.v1')
  async onKsefSent(@Payload() data: TaxInvoiceKsefSentV1Event) {
    await this.syncOpportunityMilestones(data.projectId, data.milestone, 'INVOICED', {
      ksefRef: data.ksefReferenceNumber,
      amount: data.amount,
    });
    this.logger.log(`[CRM] Milestone ${data.milestone} INVOICED (KSeF ${data.ksefReferenceNumber})`);
  }

  @EventPattern('finance.revenue.recognized.v1')
  async onRevenueRecognized(
    @Payload() data: { projectId: string; milestone: string; amount: number },
  ) {
    await this.syncOpportunityMilestones(data.projectId, data.milestone, 'RECOGNIZED', {
      amount: data.amount,
    });
    this.logger.log(`[CRM] Milestone ${data.milestone} REVENUE RECOGNIZED`);
  }

  private async syncOpportunityMilestones(
    projectId: string,
    milestoneCode: string,
    status: string,
    extra: { ksefRef?: string; amount?: number },
  ) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { linkedProjectId: projectId },
    });
    if (!opp) {
      this.logger.debug(`[CRM] No opportunity linked to project ${projectId}`);
      return;
    }

    const raw = opp.paymentMilestones;
    const list: MilestoneRow[] = Array.isArray(raw)
      ? (raw as MilestoneRow[])
      : typeof raw === 'object' && raw !== null
        ? (Object.values(raw) as MilestoneRow[])
        : [];

    const code = milestoneCode.toUpperCase();
    let matched = false;
    const updated = list.map((m) => {
      const phase = (m.phase || m.milestone || '').toUpperCase();
      if (phase.includes(code) || m.milestone === code) {
        matched = true;
        return {
          ...m,
          milestone: code,
          status,
          ksefRef: extra.ksefRef ?? m.ksefRef,
          amount: extra.amount ?? m.amount,
          invoicedAt: status === 'INVOICED' ? new Date().toISOString() : m.invoicedAt,
        };
      }
      return m;
    });

    if (!matched) {
      updated.push({
        id: `ms-${code}`,
        phase: milestoneCode,
        milestone: code,
        percentage: 0,
        status,
        ...extra,
      });
    }

    await this.prisma.opportunity.update({
      where: { id: opp.id },
      data: { paymentMilestones: updated as object },
    });
  }
}
