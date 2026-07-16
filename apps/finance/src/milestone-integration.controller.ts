import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import type {
  FinancePaymentMilestoneReachedV1Event,
  HrTimeEntryRecordedV1Event,
  TaxInvoiceKsefSentV1Event,
} from '@erp/shared-kernel';
import { CommandBus } from '@nestjs/cqrs';
import { RecordTransactionCommand } from './commands/record-transaction.handler';
import { PrismaService } from './prisma.service';

@Controller()
export class MilestoneIntegrationController {
  private readonly logger = new Logger(MilestoneIntegrationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  @EventPattern('finance.payment.milestone.reached.v1')
  async handleMilestoneReached(
    @Payload() data: FinancePaymentMilestoneReachedV1Event,
    @Ctx() context?: NatsContext,
  ) {
    const hdrs = context?.getHeaders?.() || {};
    const userId = (hdrs?.['x-user-id'] as string) || data.reachedBy || 'system';
    const tenantId = data.tenantId || 'default';

    this.logger.log(
      `[Finance] Milestone ${data.milestone} reached for project ${data.projectId} amount=${data.amount} PLN`,
    );

    await this.prisma.milestoneBilling.upsert({
      where: {
        tenantId_projectId_milestone: {
          tenantId,
          projectId: data.projectId,
          milestone: data.milestone,
        },
      },
      update: {
        amount: data.amount,
        percent: data.percent,
        status: 'READY',
        reachedAt: new Date(),
      },
      create: {
        tenantId,
        projectId: data.projectId,
        milestone: data.milestone,
        amount: data.amount,
        percent: data.percent,
        status: 'READY',
        reachedAt: new Date(),
      },
    }).catch((e) => {
      this.logger.warn(`[Finance] MilestoneBilling upsert failed: ${e.message}`);
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateId: data.projectId,
        aggregateType: 'Project',
        eventType: 'finance.payment.milestone.reached.v1',
        payload: { ...data, processedBy: userId },
        status: 'PENDING',
      },
    }).catch(() => {});

    return { status: 'milestone-recorded', milestone: data.milestone };
  }

  @EventPattern('hr.time.entry.recorded.v1')
  async handleTimeEntry(
    @Payload() data: HrTimeEntryRecordedV1Event,
    @Ctx() context?: NatsContext,
  ) {
    const hdrs = context?.getHeaders?.() || {};
    const userId = (hdrs?.['x-user-id'] as string) || data.recordedBy || 'system';
    const tenantId = data.tenantId || 'default';
    const laborAmount = Math.round(data.hours * data.hourlyRatePln * 100) / 100;

    if (laborAmount <= 0) return;

    this.logger.log(
      `[Finance HR] Labor ${data.hours}h @ ${data.hourlyRatePln} for project ${data.projectId}`,
    );

    await this.prisma.projectCost.create({
      data: {
        tenantId,
        projectId: data.projectId,
        workOrderId: data.workOrderId,
        costType: 'LABOR',
        amount: laborAmount,
        currency: 'PLN',
        reference: data.employeeId,
      },
    }).catch(() => {});

    await this.prisma.wipAccount.upsert({
      where: { projectId: data.projectId },
      update: {
        wipBalance: { increment: laborAmount },
        laborCost: { increment: laborAmount },
      },
      create: {
        tenantId,
        projectId: data.projectId,
        wipBalance: laborAmount,
        laborCost: laborAmount,
        materialReserved: 0,
      },
    }).catch(() => {});

    return { status: 'labor-booked', amount: laborAmount, actor: userId };
  }

  @EventPattern('tax.invoice.ksef.sent.v1')
  async handleKsefInvoiceSent(@Payload() data: TaxInvoiceKsefSentV1Event) {
    const tenantId = data.tenantId || 'default';
    this.logger.log(
      `[Finance] KSeF confirmed ${data.ksefReferenceNumber} for ${data.milestone} project ${data.projectId}`,
    );

    await this.prisma.milestoneBilling.updateMany({
      where: {
        tenantId,
        projectId: data.projectId,
        milestone: data.milestone,
      },
      data: {
        status: 'INVOICED',
        invoicedAt: new Date(),
      },
    }).catch(() => {});

    // Revenue recognition (Faza 2 — po potwierdzeniu KSeF, percentage-of-completion / milestone)
    try {
      await this.prisma.revenueRecognition.create({
        data: {
          tenantId,
          projectId: data.projectId,
          milestone: data.milestone,
          amount: data.amount,
          currency: data.currency || 'PLN',
          ksefReferenceNumber: data.ksefReferenceNumber,
        },
      });

      const due = new Date();
      due.setDate(due.getDate() + 30);
      await this.prisma.receivable.create({
        data: {
          tenantId,
          client: `Projekt ${data.projectId}`,
          amount: data.amount,
          currency: data.currency || 'PLN',
          dueDate: due,
          status: 'PENDING',
          invoiceRef: data.ksefReferenceNumber,
          projectId: data.projectId,
        },
      }).catch(() => {});

      await this.prisma.milestoneBilling.updateMany({
        where: { tenantId, projectId: data.projectId, milestone: data.milestone },
        data: { status: 'RECOGNIZED', recognizedAt: new Date() },
      });

      await this.commandBus.execute(
        new RecordTransactionCommand(
          'mock-revenue-account-id',
          data.amount,
          'CREDIT',
          data.invoiceId,
          'REVENUE_RECOGNITION',
          `Revenue ${data.milestone} project ${data.projectId} (KSeF ${data.ksefReferenceNumber})`,
        ),
      );

      await this.prisma.outboxEvent.create({
        data: {
          tenantId,
          aggregateId: data.projectId,
          aggregateType: 'Project',
          eventType: 'finance.revenue.recognized.v1',
          payload: {
            projectId: data.projectId,
            milestone: data.milestone,
            amount: data.amount,
            currency: data.currency || 'PLN',
            ksefReferenceNumber: data.ksefReferenceNumber,
            recognizedAt: new Date().toISOString(),
            tenantId,
          },
          status: 'PENDING',
        },
      });
    } catch (e) {
      this.logger.warn(`[Finance] Revenue recognition failed: ${(e as Error).message}`);
    }

    return { status: 'milestone-invoiced-and-recognized', ksef: data.ksefReferenceNumber };
  }
}
