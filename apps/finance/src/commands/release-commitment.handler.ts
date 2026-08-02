import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { wasProcessed, markProcessed } from '@erp/shared-kernel';
import { PrismaService } from '../prisma.service';
import { ensureAccount } from '../finance-accounts';
import { PeriodCloseService } from '../period-close.service';
import { ArApService } from '../ar-ap.service';

export const RELEASE_COMMITMENT_CONSUMER = 'finance.release-commitment';

/**
 * Args order matches compensation.controller + matrix:
 * tenantId, correlationId, orderRef?, amount?, eventId?
 */
export class ReleaseCommitmentCommand {
  constructor(
    public readonly tenantId: string,
    public readonly correlationId: string,
    public readonly orderRef?: string,
    public readonly amount?: number,
    public readonly eventId?: string,
    public readonly projectId?: string,
  ) {}
}

/**
 * Saga compensation: release procurement commitment (PO money side).
 */
@CommandHandler(ReleaseCommitmentCommand)
export class ReleaseCommitmentHandler implements ICommandHandler<ReleaseCommitmentCommand> {
  private readonly logger = new Logger(ReleaseCommitmentHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: PeriodCloseService,
    private readonly arAp: ArApService,
  ) {}

  async execute(command: ReleaseCommitmentCommand) {
    const tenantId = command.tenantId || 'default';
    const orderRef = command.orderRef || command.correlationId;
    this.logger.log(
      `[Finance AP] Release commitment order=${orderRef} correlation=${command.correlationId}`,
    );

    if (!command.correlationId && !orderRef) {
      return { ok: false, reason: 'missing_ids' };
    }

    try {
      await this.periods.assertPostingAllowed(tenantId);
    } catch (e) {
      return { ok: false, reason: 'period_closed', message: (e as Error).message };
    }

    const ledgerKey = {
      eventId: (command.eventId || `commit-${command.correlationId || orderRef}`).trim(),
      consumer: RELEASE_COMMITMENT_CONSUMER,
    };

    try {
      if (await wasProcessed(this.prisma as any, ledgerKey)) {
        return { ok: true, idempotent: true, reason: 'processed_event' };
      }
    } catch {
      /* optional */
    }

    const apGl = await ensureAccount(
      this.prisma,
      '201-AP',
      'Zobowiązania wobec dostawców',
      'LIABILITY',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const existingJe = await tx.journalEntry.findFirst({
        where: {
          tenantId,
          referenceId: command.correlationId || orderRef,
          source: 'SAGA_COMPENSATION_COMMITMENT',
        },
      });
      if (existingJe) {
        return { ok: true, idempotent: true, journalEntryId: existingJe.id };
      }

      let amount = Number(command.amount || 0);
      if (amount <= 0) {
        const payable = await tx.payable.findFirst({
          where: {
            tenantId,
            orderRef: orderRef || undefined,
            status: { in: ['PENDING', 'OVERDUE'] },
          },
        });
        amount = payable ? Number(payable.amount) : 0;
      }
      if (amount <= 0) {
        const prior = await tx.journalEntry.findFirst({
          where: {
            tenantId,
            referenceId: orderRef,
            source: 'PROCUREMENT',
          },
        });
        amount = prior ? Number(prior.amount) : 0;
      }
      if (amount <= 0) {
        return { ok: true, reason: 'no_commitment' };
      }

      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          accountId: apGl.id,
          amount,
          type: 'DEBIT',
          referenceId: command.correlationId || orderRef,
          source: 'SAGA_COMPENSATION_COMMITMENT',
          description: `Release PO commitment ${orderRef}`,
        },
      });

      await tx.account.update({
        where: { id: apGl.id },
        data: { balance: { decrement: amount } },
      });

      await tx.payable.updateMany({
        where: { tenantId, orderRef: orderRef || undefined, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      if (command.projectId) {
        const wip = await tx.wipAccount.findUnique({ where: { projectId: command.projectId } });
        if (wip && Number(wip.materialReserved) > 0) {
          const dec = Math.min(Number(wip.materialReserved), amount);
          await tx.wipAccount.update({
            where: { projectId: command.projectId },
            data: { materialReserved: { decrement: dec } },
          });
        }
      }

      return { ok: true, idempotent: false, amount, journalEntryId: entry.id };
    });

    if (orderRef) {
      await this.arAp.voidApByOrderRef(tenantId, orderRef).catch(() => {});
    }

    try {
      await markProcessed(this.prisma as any, ledgerKey);
    } catch {
      /* ignore */
    }

    return result;
  }
}
