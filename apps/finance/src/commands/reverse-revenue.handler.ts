import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { wasProcessed, markProcessed } from '@erp/shared-kernel';
import { PrismaService } from '../prisma.service';
import { ensureAccount } from '../finance-accounts';
import { PeriodCloseService } from '../period-close.service';
import { ArApService } from '../ar-ap.service';

export const REVERSE_REVENUE_CONSUMER = 'finance.reverse-revenue';

/**
 * Args order matches compensation.controller + CompensationMatrixService:
 * projectId, tenantId, correlationId, amount?, eventId?
 */
export class ReverseRevenueCommand {
  constructor(
    public readonly projectId: string,
    public readonly tenantId: string,
    public readonly correlationId: string,
    public readonly amount?: number,
    public readonly eventId?: string,
  ) {}
}

/**
 * Saga compensation: reverse revenue recognition keyed by correlationId.
 * Creates DEBIT on 701-REV, voids AR invoice, marks receivable cancelled.
 */
@CommandHandler(ReverseRevenueCommand)
export class ReverseRevenueHandler implements ICommandHandler<ReverseRevenueCommand> {
  private readonly logger = new Logger(ReverseRevenueHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: PeriodCloseService,
    private readonly arAp: ArApService,
  ) {}

  async execute(command: ReverseRevenueCommand) {
    const { projectId, tenantId, correlationId } = command;
    this.logger.log(
      `[Finance REV] Reverse revenue project=${projectId} correlation=${correlationId}`,
    );

    if (!correlationId) {
      return { ok: false, reason: 'missing_correlationId' };
    }

    try {
      await this.periods.assertPostingAllowed(tenantId);
    } catch (e) {
      this.logger.warn(`[Finance REV] refused: ${(e as Error).message}`);
      return { ok: false, reason: 'period_closed', message: (e as Error).message };
    }

    const ledgerKey = {
      eventId: (command.eventId || `rev-${correlationId}`).trim(),
      consumer: REVERSE_REVENUE_CONSUMER,
    };

    try {
      if (await wasProcessed(this.prisma as any, ledgerKey)) {
        return { ok: true, idempotent: true, reason: 'processed_event' };
      }
    } catch {
      /* ledger optional mid-migration */
    }

    const revGl = await ensureAccount(
      this.prisma,
      '701-REV',
      'Przychody ze sprzedaży',
      'REVENUE',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const existingJe = await tx.journalEntry.findFirst({
        where: {
          tenantId,
          referenceId: correlationId,
          source: 'SAGA_COMPENSATION_REVENUE',
        },
      });
      if (existingJe) {
        return { ok: true, idempotent: true, journalEntryId: existingJe.id };
      }

      let amount = Number(command.amount || 0);
      if (amount <= 0) {
        const byKsef = await tx.revenueRecognition.findMany({
          where: {
            tenantId,
            OR: [
              { ksefReferenceNumber: correlationId },
              ...(projectId ? [{ projectId }] : []),
            ],
          },
          take: 20,
        });
        amount = byKsef.reduce((s, r) => s + Number(r.amount), 0);
      }

      if (amount <= 0) {
        const prior = await tx.journalEntry.findFirst({
          where: {
            tenantId,
            referenceId: correlationId,
            source: { in: ['REVENUE_RECOGNITION', 'AR_INVOICE'] },
          },
        });
        amount = prior ? Number(prior.amount) : 0;
      }

      if (amount <= 0) {
        this.logger.log(`[Finance REV] nothing to reverse correlation=${correlationId}`);
        return { ok: true, reason: 'no_revenue' };
      }

      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          accountId: revGl.id,
          amount,
          type: 'DEBIT',
          referenceId: correlationId,
          source: 'SAGA_COMPENSATION_REVENUE',
          description: `Revenue reverse project ${projectId} correlation ${correlationId}`,
        },
      });

      await tx.account.update({
        where: { id: revGl.id },
        data: { balance: { decrement: amount } },
      });

      await tx.receivable.updateMany({
        where: {
          tenantId,
          OR: [
            { invoiceRef: correlationId },
            ...(projectId ? [{ projectId }] : []),
          ],
          status: 'PENDING',
        },
        data: { status: 'CANCELLED' },
      });

      return {
        ok: true,
        idempotent: false,
        amount,
        journalEntryId: entry.id,
      };
    });

    if (result.ok && !(result as { idempotent?: boolean }).idempotent) {
      await this.arAp.voidArByCorrelation(tenantId, correlationId).catch(() => {});
    }

    try {
      await markProcessed(this.prisma as any, ledgerKey);
    } catch {
      /* ignore */
    }

    return result;
  }
}
