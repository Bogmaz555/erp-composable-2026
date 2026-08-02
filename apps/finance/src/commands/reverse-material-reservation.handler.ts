import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { wasProcessed, markProcessed } from '@erp/shared-kernel';
import { PrismaService } from '../prisma.service';
import { ensureAccount } from '../finance-accounts';
import { PeriodCloseService } from '../period-close.service';

export const RESERVATION_MATERIAL_REVERSE_CONSUMER = 'finance.reservation-material-reverse';

export class ReverseMaterialReservationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly workOrderId: string,
    public readonly correlationId: string,
    public readonly projectId?: string,
    public readonly eventId?: string,
  ) {}
}

/**
 * Finance side-effect of inventory.reservation.restored / release compensation:
 * reverse MATERIAL ProjectCost / WIP material for the work order.
 */
@CommandHandler(ReverseMaterialReservationCommand)
export class ReverseMaterialReservationHandler
  implements ICommandHandler<ReverseMaterialReservationCommand>
{
  private readonly logger = new Logger(ReverseMaterialReservationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: PeriodCloseService,
  ) {}

  async execute(command: ReverseMaterialReservationCommand) {
    const tenantId = command.tenantId || 'default';
    const { workOrderId, correlationId } = command;
    this.logger.log(
      `[Finance MAT] Reverse material reservation WO=${workOrderId} correlation=${correlationId}`,
    );

    if (!workOrderId && !correlationId) {
      return { ok: false, reason: 'missing_ids' };
    }

    try {
      await this.periods.assertPostingAllowed(tenantId);
    } catch (e) {
      return { ok: false, reason: 'period_closed', message: (e as Error).message };
    }

    const ledgerKey = {
      eventId: (command.eventId || `mat-${correlationId || workOrderId}`).trim(),
      consumer: RESERVATION_MATERIAL_REVERSE_CONSUMER,
    };

    try {
      if (await wasProcessed(this.prisma as any, ledgerKey)) {
        return { ok: true, idempotent: true, reason: 'processed_event' };
      }
    } catch {
      /* optional */
    }

    const wipGl = await ensureAccount(this.prisma, '130-WIP', 'Produkcja w toku', 'ASSET');

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectCost.findFirst({
        where: {
          tenantId,
          costType: 'MATERIAL_REVERSAL',
          reference: correlationId || workOrderId,
        },
      });
      if (existing) {
        return { ok: true, idempotent: true, projectCostId: existing.id };
      }

      const materials = await tx.projectCost.findMany({
        where: {
          tenantId,
          costType: 'MATERIAL',
          ...(workOrderId ? { workOrderId } : {}),
        },
        take: 100,
      });

      let total = materials.reduce((s, m) => s + Number(m.amount), 0);
      const projectId =
        command.projectId || materials[0]?.projectId || workOrderId || 'unknown';

      if (total <= 0) {
        const wip = await tx.wipAccount.findUnique({ where: { projectId } });
        total = wip ? Number(wip.materialReserved) : 0;
      }

      if (total <= 0) {
        return { ok: true, reason: 'no_material' };
      }

      const cost = await tx.projectCost.create({
        data: {
          tenantId,
          projectId,
          workOrderId: workOrderId || null,
          costType: 'MATERIAL_REVERSAL',
          amount: -total,
          currency: 'PLN',
          reference: correlationId || workOrderId,
        },
      });

      const wip = await tx.wipAccount.findUnique({ where: { projectId } });
      if (wip) {
        const matDec = Math.min(Number(wip.materialReserved), total);
        const balDec = Math.min(Number(wip.wipBalance), total);
        await tx.wipAccount.update({
          where: { projectId },
          data: {
            materialReserved: { decrement: matDec },
            wipBalance: { decrement: balDec },
          },
        });
      }

      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          accountId: wipGl.id,
          amount: total,
          type: 'CREDIT',
          referenceId: correlationId || workOrderId,
          source: 'SAGA_COMPENSATION_MATERIAL',
          description: `Material reservation reverse WO ${workOrderId}`,
        },
      });

      await tx.account.update({
        where: { id: wipGl.id },
        data: { balance: { decrement: total } },
      });

      return {
        ok: true,
        idempotent: false,
        amount: total,
        projectCostId: cost.id,
        journalEntryId: entry.id,
      };
    });

    try {
      await markProcessed(this.prisma as any, ledgerKey);
    } catch {
      /* ignore */
    }

    return result;
  }
}
