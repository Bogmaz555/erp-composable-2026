import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PeriodCloseService } from './period-close.service';
import { ensureAccount } from './finance-accounts';

export interface CreateArInvoiceInput {
  tenantId?: string;
  projectId?: string;
  client: string;
  amount: number;
  currency?: string;
  milestone?: string;
  ksefReference?: string;
  correlationId?: string;
  invoiceRef?: string;
  description?: string;
  dueDate?: Date;
  /** When true, post GL and link journalEntryId */
  postToJournal?: boolean;
}

export interface CreateApBillInput {
  tenantId?: string;
  vendor: string;
  amount: number;
  currency?: string;
  orderRef?: string;
  correlationId?: string;
  description?: string;
  dueDate?: Date;
  postToJournal?: boolean;
}

/**
 * Minimal AR/AP skeleton for ETO billing (Enterprise Q2 PR2).
 * Records link to JournalEntry via journalEntryId — not a full ERP AR/AP suite.
 */
@Injectable()
export class ArApService {
  private readonly logger = new Logger(ArApService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: PeriodCloseService,
  ) {}

  async createArInvoice(input: CreateArInvoiceInput) {
    const tenantId = input.tenantId || 'default';
    await this.periods.assertPostingAllowed(tenantId);

    let journalEntryId: string | null = null;
    let status = 'OPEN';
    let postedAt: Date | null = null;

    if (input.postToJournal !== false && input.amount > 0) {
      const rev = await ensureAccount(
        this.prisma,
        '701-REV',
        'Przychody ze sprzedaży',
        'REVENUE',
      );
      const ar = await ensureAccount(this.prisma, '200-AR', 'Należności od odbiorców', 'ASSET');

      const entry = await this.prisma.$transaction(async (tx) => {
        const je = await tx.journalEntry.create({
          data: {
            tenantId,
            accountId: rev.id,
            amount: input.amount,
            type: 'CREDIT',
            referenceId: input.correlationId || input.ksefReference || input.invoiceRef,
            source: 'AR_INVOICE',
            description:
              input.description ||
              `AR invoice ${input.milestone || ''} project ${input.projectId || ''}`.trim(),
          },
        });
        await tx.account.update({
          where: { id: rev.id },
          data: { balance: { increment: input.amount } },
        });
        await tx.journalEntry.create({
          data: {
            tenantId,
            accountId: ar.id,
            amount: input.amount,
            type: 'DEBIT',
            referenceId: input.correlationId || input.ksefReference || input.invoiceRef,
            source: 'AR_INVOICE',
            description: `AR debit ${input.client}`,
          },
        });
        await tx.account.update({
          where: { id: ar.id },
          data: { balance: { increment: input.amount } },
        });
        return je;
      });
      journalEntryId = entry.id;
      status = 'POSTED';
      postedAt = new Date();
    }

    const inv = await this.prisma.arInvoice.create({
      data: {
        tenantId,
        projectId: input.projectId,
        client: input.client,
        amount: input.amount,
        currency: input.currency || 'PLN',
        status,
        milestone: input.milestone,
        ksefReference: input.ksefReference,
        journalEntryId,
        correlationId: input.correlationId,
        invoiceRef: input.invoiceRef || input.ksefReference,
        description: input.description,
        dueDate: input.dueDate,
        postedAt,
      },
    });

    this.logger.log(
      `[AR] invoice ${inv.id} amount=${input.amount} status=${status} je=${journalEntryId || 'none'}`,
    );
    return inv;
  }

  async createApBill(input: CreateApBillInput) {
    const tenantId = input.tenantId || 'default';
    await this.periods.assertPostingAllowed(tenantId);

    let journalEntryId: string | null = null;
    let status = 'OPEN';
    let postedAt: Date | null = null;

    if (input.postToJournal !== false && input.amount > 0) {
      const ap = await ensureAccount(
        this.prisma,
        '201-AP',
        'Zobowiązania wobec dostawców',
        'LIABILITY',
      );
      const entry = await this.prisma.journalEntry.create({
        data: {
          tenantId,
          accountId: ap.id,
          amount: input.amount,
          type: 'CREDIT',
          referenceId: input.correlationId || input.orderRef,
          source: 'AP_BILL',
          description:
            input.description ||
            `AP bill vendor=${input.vendor} order=${input.orderRef || ''}`,
        },
      });
      await this.prisma.account.update({
        where: { id: ap.id },
        data: { balance: { increment: input.amount } },
      });
      journalEntryId = entry.id;
      status = 'POSTED';
      postedAt = new Date();
    }

    const bill = await this.prisma.apBill.create({
      data: {
        tenantId,
        vendor: input.vendor,
        amount: input.amount,
        currency: input.currency || 'PLN',
        status,
        orderRef: input.orderRef,
        journalEntryId,
        correlationId: input.correlationId,
        description: input.description,
        dueDate: input.dueDate,
        postedAt,
      },
    });

    this.logger.log(
      `[AP] bill ${bill.id} amount=${input.amount} status=${status} je=${journalEntryId || 'none'}`,
    );
    return bill;
  }

  async listAr(tenantId = 'default', take = 50) {
    return this.prisma.arInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async listAp(tenantId = 'default', take = 50) {
    return this.prisma.apBill.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async voidArByCorrelation(tenantId: string, correlationId: string) {
    const rows = await this.prisma.arInvoice.findMany({
      where: { tenantId, correlationId, status: { not: 'VOID' } },
    });
    for (const r of rows) {
      await this.prisma.arInvoice.update({
        where: { id: r.id },
        data: { status: 'VOID' },
      });
    }
    return { voided: rows.length };
  }

  async voidApByOrderRef(tenantId: string, orderRef: string) {
    const rows = await this.prisma.apBill.findMany({
      where: { tenantId, orderRef, status: { not: 'VOID' } },
    });
    for (const r of rows) {
      await this.prisma.apBill.update({
        where: { id: r.id },
        data: { status: 'VOID' },
      });
    }
    return { voided: rows.length };
  }
}
