import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, Optional } from '@nestjs/common';
import { wasProcessed, markProcessed } from '@erp/shared-kernel';
import { PrismaService } from '../prisma.service';
import { ensureAccount } from '../finance-accounts';
import { PeriodCloseService } from '../period-close.service';

/** Durable consumer name for processed_events ledger (Enterprise Q0 / E0.3). */
export const REVERSE_WIP_CONSUMER = 'finance.reverse-wip';

export class ReverseWipCostCommand {
  constructor(
    public readonly projectId: string,
    public readonly tenantId: string,
    public readonly correlationId: string,
    /** Optional JetStream/outbox msg id; defaults to correlationId for ledger key. */
    public readonly eventId?: string,
  ) {}
}

/**
 * Saga G-lite compensation: reverse project WIP for a correlationId.
 *
 * Hardening (PR16):
 * - Idempotent by ProjectCost REVERSAL.reference = correlationId
 * - Real GL account 130-WIP via ensureAccount (not a mock account id)
 * - Single outer $transaction — journal + WIP + ProjectCost use same tx
 *   (GL written inline; no nested bus execute / nested PrismaClient transaction)
 *
 * Enterprise Q0 / E0.3:
 * - processed_events ledger on (eventId|correlationId, finance.reverse-wip)
 *
 * Enterprise Q2:
 * - period close guard (refuse when CLOSED)
 */
@CommandHandler(ReverseWipCostCommand)
export class ReverseWipCostHandler implements ICommandHandler<ReverseWipCostCommand> {
  private readonly logger = new Logger(ReverseWipCostHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly periods?: PeriodCloseService,
  ) {}

  async execute(command: ReverseWipCostCommand) {
    const { projectId, tenantId, correlationId } = command;
    this.logger.log(
      `[Finance WIP] Reversing WIP costs for project ${projectId} (correlation: ${correlationId})`,
    );

    if (!projectId || !correlationId) {
      this.logger.warn('ReverseWipCost: missing projectId or correlationId — skip');
      return { ok: false, reason: 'missing_ids' };
    }

    if (this.periods) {
      try {
        await this.periods.assertPostingAllowed(tenantId);
      } catch (e) {
        this.logger.warn(`[Finance WIP] refused: ${(e as Error).message}`);
        return { ok: false, reason: 'period_closed', message: (e as Error).message };
      }
    }

    const ledgerKey = {
      eventId: (command.eventId || correlationId).trim(),
      consumer: REVERSE_WIP_CONSUMER,
    };

    // Ledger short-circuit (in addition to business-key idempotency below)
    try {
      if (await wasProcessed(this.prisma as any, ledgerKey)) {
        this.logger.log(
          `[Finance WIP] processed_events hit eventId=${ledgerKey.eventId} — no-op`,
        );
        return { ok: true, idempotent: true, reason: 'processed_event' };
      }
    } catch (e) {
      // Table may not exist mid-migration — continue with business idempotency
      this.logger.debug(
        `processed_events check skipped: ${(e as Error).message}`,
      );
    }

    // Resolve real GL account outside the mutation tx (upsert is idempotent)
    const wipGl = await ensureAccount(
      this.prisma,
      '130-WIP',
      'Produkcja w toku',
      'ASSET',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // --- Idempotency: one REVERSAL per correlationId ---
      const existing = await tx.projectCost.findFirst({
        where: {
          tenantId,
          projectId,
          costType: 'REVERSAL',
          reference: correlationId,
        },
      });
      if (existing) {
        this.logger.log(
          `[Finance WIP] Already reversed for correlationId=${correlationId} (projectCost=${existing.id}) — no-op`,
        );
        return { ok: true, idempotent: true, projectCostId: existing.id };
      }

      // Also treat journal already posted for this correlation as done
      const existingJe = await tx.journalEntry.findFirst({
        where: {
          tenantId,
          referenceId: correlationId,
          source: 'SAGA_COMPENSATION',
        },
      });
      if (existingJe) {
        this.logger.log(
          `[Finance WIP] Journal already exists for correlationId=${correlationId} — no-op`,
        );
        return { ok: true, idempotent: true, journalEntryId: existingJe.id };
      }

      const wip = await tx.wipAccount.findUnique({
        where: { projectId },
      });

      if (!wip) {
        this.logger.warn(`No WIP account found for project ${projectId}. Nothing to reverse.`);
        return { ok: true, reason: 'no_wip' };
      }

      const totalBalance = Number(wip.wipBalance);
      if (totalBalance <= 0) {
        this.logger.log(
          `[Finance WIP] WIP balance already 0 for project ${projectId} — no-op reverse`,
        );
        return { ok: true, reason: 'zero_balance' };
      }

      // Reverse ProjectCost
      const cost = await tx.projectCost.create({
        data: {
          tenantId,
          projectId,
          costType: 'REVERSAL',
          amount: -totalBalance,
          currency: 'PLN',
          reference: correlationId,
        },
      });

      // Reset WIP
      await tx.wipAccount.update({
        where: { projectId },
        data: {
          wipBalance: 0,
          laborCost: 0,
          materialReserved: 0,
        },
      });

      // GL Journal entry (CREDIT asset) + balance update — same tx, real account
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          accountId: wipGl.id,
          amount: totalBalance,
          type: 'CREDIT',
          referenceId: correlationId,
          source: 'SAGA_COMPENSATION',
          description: `Reversal of WIP for project ${projectId}`,
        },
      });

      // CREDIT reduces ASSET balance (mirrors RecordTransactionHandler)
      await tx.account.update({
        where: { id: wipGl.id },
        data: {
          balance: { decrement: totalBalance },
        },
      });

      this.logger.log(
        `[Finance WIP] Reversed ${totalBalance} PLN project=${projectId} correlationId=${correlationId} je=${entry.id}`,
      );

      return {
        ok: true,
        idempotent: false,
        amount: totalBalance,
        projectCostId: cost.id,
        journalEntryId: entry.id,
        accountCode: '130-WIP',
      };
    });

    // Mark ledger after successful domain work (ignore unique race)
    try {
      await markProcessed(this.prisma as any, ledgerKey);
    } catch (e) {
      this.logger.debug(
        `processed_events mark skipped: ${(e as Error).message}`,
      );
    }

    return result;
  }
}
