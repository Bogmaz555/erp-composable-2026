import { Controller, Get, Logger, Query } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { FinancePaymentMilestoneReachedV1Event } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';
import { KsefRouterService } from './ksef-router.service';
import { JpkV7Service } from './jpk-v7.service';
import { JpkKrService } from './jpk-kr.service';
import { JpkKrValidatorService } from './jpk-kr-validator.service';

@Controller('tax-legal')
export class TaxLegalController {
  private readonly logger = new Logger(TaxLegalController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ksef: KsefRouterService,
    private readonly jpk: JpkV7Service,
    private readonly jpkKr: JpkKrService,
    private readonly jpkKrValidator: JpkKrValidatorService,
  ) {}

  @Get('health')
  health() {
    return { status: 'TaxLegalPBC running', ksef: this.ksef.getStatus() };
  }

  @Get('ksef/status')
  ksefStatus() {
    return this.ksef.getStatus();
  }

  @Get('ksef/production/profile')
  ksefProductionProfile() {
    const mode = process.env.KSEF_MODE || 'sandbox';
    const status = this.ksef.getStatus();
    return {
      mode,
      faSchema: 'FA(3)',
      production: status,
      profileReady:
        mode === 'production'
          ? !!(process.env.KSEF_API_URL && process.env.KSEF_TOKEN)
          : true,
      checkedAt: new Date().toISOString(),
    };
  }

  @Get('jpk/kr')
  async jpkKrExport(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = parseInt(month || String(new Date().getMonth() + 1), 10);
    return this.jpkKr.generateLedgerBook(y, m);
  }

  @Get('jpk/kr/validate')
  async jpkKrValidate(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = parseInt(month || String(new Date().getMonth() + 1), 10);
    const book = await this.jpkKr.generateLedgerBook(y, m);
    return { ...this.jpkKrValidator.validate(book as Record<string, unknown>), period: book.period };
  }

  @Get('jpk/v7')
  async jpkV7(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = parseInt(year || String(new Date().getFullYear()), 10);
    const m = parseInt(month || String(new Date().getMonth() + 1), 10);
    return this.jpk.generateSalesRegister(y, m);
  }

  @Get('invoices')
  async listInvoices() {
    return this.prisma.taxInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** ADR-004: sole path to issue invoices on milestone payment */
  @EventPattern('finance.payment.milestone.reached.v1')
  async onMilestoneInvoice(@Payload() data: FinancePaymentMilestoneReachedV1Event) {
    const tenantId = data.tenantId || 'default';
    this.logger.log(
      `[TaxLegal] KSeF invoice for ${data.milestone} project=${data.projectId} amount=${data.amount}`,
    );

    const invoice = await this.prisma.taxInvoice.create({
      data: {
        tenantId,
        projectId: data.projectId,
        milestone: data.milestone,
        amount: data.amount,
        currency: data.currency || 'PLN',
        status: 'DRAFT',
      },
    }).catch(() => null);

    const ksefResult = await this.ksef.sendInvoice({
      projectId: data.projectId,
      milestone: data.milestone,
      amount: data.amount,
      currency: data.currency || 'PLN',
    });
    const { ksefReferenceNumber } = ksefResult;

    if (invoice) {
      await this.prisma.taxInvoice.update({
        where: { id: invoice.id },
        data: {
          ksefReferenceNumber,
          status: 'SENT',
          sentAt: new Date(),
        },
      }).catch(() => {});
    }

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateId: invoice?.id || data.projectId,
        aggregateType: 'TaxInvoice',
        eventType: 'tax.invoice.ksef.sent.v1',
        payload: {
          invoiceId: invoice?.id || require('crypto').randomUUID(),
          ksefReferenceNumber,
          projectId: data.projectId,
          milestone: data.milestone,
          amount: data.amount,
          currency: data.currency || 'PLN',
          sentAt: new Date().toISOString(),
          tenantId,
        },
        status: 'PENDING',
      },
    }).catch(() => {});

    return { status: 'ksef-sent', ksefReferenceNumber };
  }
}
