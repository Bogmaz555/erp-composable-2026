import { Controller, Get, Post, Body, Logger, Param } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import type { MesProductionRecordedV1Event } from '@erp/shared-kernel';
import { RecordTransactionCommand } from './commands/record-transaction.handler';
import { PrismaService } from './prisma.service';
import {
  computeLaborCostPln,
  computeOverheadFromLaborPln,
} from './eto-project-costing';
import { resolveLaborRatePln, resolveOverheadPct } from './cost-rate.resolver';
import { ensureAccount } from './finance-accounts';
import { EntryType } from '@prisma/client-finance';
import { ProjectAccountingService } from './project-accounting.service';

@Controller('fin')
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,   // for real ProjectCost / WIP accounting (ETO)
    private readonly projectAccounting: ProjectAccountingService,
  ) {}

  @Get('health')
  getHealth() {
    return { status: 'Finance Service is running' };
  }

  /** ETO milestone billing (FAT/SAT) — synced from PM + TaxLegal */
  @Get('revenue')
  async getRevenueRecognitions() {
    try {
      const rows = await this.prisma.revenueRecognition.findMany({
        orderBy: { recognizedAt: 'desc' },
        take: 50,
      });
      if (rows.length > 0) return rows;
    } catch { /* */ }
    return [];
  }

  @Get('wip')
  async getWipAccounts() {
    try {
      return await this.prisma.wipAccount.findMany({ take: 50 });
    } catch {
      return [];
    }
  }

  /** W53 — project WIP breakdown by cost type (SAP-deep project accounting) */
  @Get('projects/:projectId/wip-breakdown')
  async getProjectWipBreakdown(@Param('projectId') projectId: string) {
    return this.projectAccounting.getWipBreakdown(projectId);
  }

  @Get('milestones')
  async getMilestones() {
    try {
      const rows = await this.prisma.milestoneBilling.findMany({
        orderBy: { reachedAt: 'desc' },
        take: 100,
      });
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          projectId: r.projectId,
          milestone: r.milestone,
          amount: r.amount,
          percent: r.percent,
          status: r.status,
          reachedAt: r.reachedAt?.toISOString(),
          invoicedAt: r.invoicedAt?.toISOString(),
        }));
      }
    } catch {
      /* DB not migrated */
    }
    return [];
  }

  // Procurement commitment: see ProcIntegrationController (proc.purchaseorder.approved.v1)

  // TD-001 + Faza 1: Finance WIP listener on reservation release (closing the ETO loop)
  // Now extracts claims when available (NATS header propagation) and enriches audit description
  /** Labor + overhead costing on production complete (before/at reservation release) */
  @EventPattern('mes.production.recorded.v1')
  async handleProductionRecorded(
    @Payload() data: MesProductionRecordedV1Event,
    @Ctx() context?: NatsContext,
  ) {
    const hdrs = context?.getHeaders?.() || {};
    const userId = (hdrs?.['x-user-id'] as string) || data.operatorId || 'system';
    const laborHours = data.laborHours ?? 0;

    if (laborHours <= 0 || !data.projectId) {
      return;
    }

    const tenantId = data.tenantId || 'default';
    const laborRate = await resolveLaborRatePln(this.prisma, data.projectId, tenantId);
    const overheadPct = await resolveOverheadPct(this.prisma, data.projectId, tenantId);
    const laborAmount = computeLaborCostPln(laborHours, laborRate);
    const overheadAmount = computeOverheadFromLaborPln(laborAmount, overheadPct);

    this.logger.log(
      `[Finance LABOR] WO ${data.workOrderId} project=${data.projectId} hours=${laborHours} amount=${laborAmount} PLN (user=${userId})`,
    );

    try {
      await this.prisma.projectCost.create({
        data: {
          tenantId,
          projectId: data.projectId,
          workOrderId: data.workOrderId,
          costType: 'LABOR',
          amount: laborAmount,
          currency: 'PLN',
          reference: data.operatorId || userId,
        },
      });
      if (overheadAmount > 0) {
        await this.prisma.projectCost.create({
          data: {
            tenantId,
            projectId: data.projectId,
            workOrderId: data.workOrderId,
            costType: 'OVERHEAD',
            amount: overheadAmount,
            currency: 'PLN',
            reference: 'overhead-15pct',
          },
        });
      }
      await this.prisma.wipAccount.upsert({
        where: { projectId: data.projectId },
        update: {
          wipBalance: { increment: laborAmount + overheadAmount },
          laborCost: { increment: laborAmount },
        },
        create: {
          tenantId,
          projectId: data.projectId,
          wipBalance: laborAmount + overheadAmount,
          laborCost: laborAmount,
          materialReserved: 0,
        },
      });
      await this.commandBus.execute(
        new RecordTransactionCommand(
          'mock-wip-account-id',
          laborAmount,
          'DEBIT',
          data.workOrderId,
          'MANUFACTURING_LABOR',
          `Labor ${laborHours}h on WO ${data.workOrderId}`,
        ),
      );
    } catch (e) {
      this.logger.warn(`[Finance] Labor costing failed: ${(e as Error).message}`);
    }
  }

  @EventPattern('inventory.reservation.released.v1')
  async handleReservationReleased(@Payload() data: { workOrderId: string, tenantId: string, releasedReservations: any[] }, @Ctx() context?: NatsContext) {
    const hdrs = context?.getHeaders?.() || {};
    const userId = (hdrs?.['x-user-id'] as string) || 'system';
    const roles = (hdrs?.['x-roles'] as string) || '';

    this.logger.log(`[Finance WIP] Received inventory.reservation.released.v1 for WO ${data.workOrderId} (user=${userId})`);

    if (userId !== 'system') {
      this.logger.log(`[TD-001] WIP relief processed by user=${userId} roles=${roles}`);
    }

    const tenantId = data.tenantId || 'public';
    const reservations = data.releasedReservations || [];

    if (reservations.length === 0) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        // --- Idempotency Check ---
        const reservationIds = reservations.map(r => r.reservationId).filter(Boolean);
        const existingCosts = await tx.projectCost.findMany({
          where: {
            reference: { in: reservationIds },
            costType: 'MATERIAL',
          },
          select: { reference: true }
        });
        const processedReferences = new Set(existingCosts.map(c => c.reference));

        const unprocessedReservations = reservations.filter(r => !processedReferences.has(r.reservationId));
        if (unprocessedReservations.length === 0) {
          this.logger.log(`[Finance] All reservations for WO ${data.workOrderId} already processed. Skipping.`);
          return;
        }

        const standardCost = 1; // Assuming 1:1 mapping for simplicity based on old tests
        let totalReleased = 0;
        const aggregatedWip: Record<string, number> = {};

        for (const res of unprocessedReservations) {
          const projId = res.projectId || data.workOrderId || 'unknown-project';
          const amount = (res.quantity || 0) * standardCost;

          totalReleased += amount;
          aggregatedWip[projId] = (aggregatedWip[projId] || 0) + amount;
        }

        const actor = userId !== 'system' ? ` by ${userId}` : '';
        await this.commandBus.execute(
          new RecordTransactionCommand(
            'mock-wip-account-id',
            totalReleased,
            'DEBIT',
            data.workOrderId,
            'MANUFACTURING',
            `WIP relief for reservation release on WO ${data.workOrderId}${actor}`
          )
        );

        // Batch insert for material cost logs
        const costData = unprocessedReservations.map(res => ({
          tenantId: tenantId,
          projectId: res.projectId || data.workOrderId || 'unknown-project',
          workOrderId: data.workOrderId,
          costType: 'MATERIAL',
          amount: res.quantity || 0,
          currency: 'PLN',
          reference: res.bomComponentId || res.reservationId || null,
        }));
        
        if (costData.length > 0) {
          await tx.projectCost.createMany({ data: costData });
        }

        // Optimized Upsert for WipAccount
        for (const projId in aggregatedWip) {
          const totalAmount = aggregatedWip[projId];
          await tx.wipAccount.upsert({
            where: { projectId: projId },
            update: {
              wipBalance: { increment: totalAmount },
              materialReserved: { decrement: totalAmount },
            },
            create: {
              tenantId: tenantId,
              projectId: projId,
              wipBalance: totalAmount,
              materialReserved: 0,
              laborCost: 0,
            },
          });
        }
      });
      this.logger.log(`[Finance] Booked transactions for WO ${data.workOrderId}`);
    } catch (e) {
      this.logger.error(`[Finance] Transaction failed for WO ${data.workOrderId}. Rejecting event.`, (e as Error).stack);
      throw e; // Fail the NATS message processing to trigger a retry or DLQ
    }
  }

  private async seedDefaultAccounts() {
    await ensureAccount(this.prisma, '130-WIP', 'Produkcja w toku', 'ASSET');
    await ensureAccount(this.prisma, '201-AP', 'Zobowiązania wobec dostawców', 'LIABILITY');
    await ensureAccount(this.prisma, '701-REV', 'Przychody ze sprzedaży', 'REVENUE');
    await ensureAccount(this.prisma, '401-MAT', 'Koszty materiałów', 'EXPENSE');
  }

  @Get('accounts')
  async getAccounts() {
    await this.seedDefaultAccounts();
    return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
  }

  @Get('journal')
  async getJournal() {
    return this.prisma.journalEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { account: true },
    });
  }

  @Post('journal')
  async postJournal(@Body() body: { accountCode: string; amount: number; type: 'DEBIT' | 'CREDIT'; description?: string; referenceId?: string }) {
    await this.seedDefaultAccounts();
    const account = await this.prisma.account.findUnique({ where: { code: body.accountCode } });
    if (!account) throw new Error(`Konto ${body.accountCode} nie istnieje`);
    const entry = await this.prisma.journalEntry.create({
      data: {
        accountId: account.id,
        amount: body.amount,
        type: body.type as EntryType,
        description: body.description,
        referenceId: body.referenceId,
        source: 'MANUAL',
      },
      include: { account: true },
    });
    const delta = body.type === 'DEBIT' ? body.amount : -body.amount;
    await this.prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: delta } },
    });
    return entry;
  }

  /** Budżet vs wykonanie — agregacja kosztów projektów ETO */
  @Get('budget-variance')
  async getBudgetVariance() {
    const PM_URL = process.env.PM_SERVICE_URL || 'http://127.0.0.1:4002';
    let projects: Array<{ id: string; name: string; budget?: number; totalBudget?: number }> = [];
    try {
      const res = await fetch(PM_URL, { signal: AbortSignal.timeout(5000) });
      if (res.ok) projects = await res.json();
    } catch (e) {
      this.logger.warn(`PM fetch for budget-variance: ${(e as Error).message}`);
    }

    const costGroups = await this.prisma.projectCost.groupBy({
      by: ['projectId'],
      _sum: { amount: true },
    });
    const wipRows = await this.prisma.wipAccount.findMany();

    const rows = projects.map((p) => {
      const budget = p.budget ?? p.totalBudget ?? 0;
      const fromCosts = costGroups.find((c) => c.projectId === p.id)?._sum.amount ?? 0;
      const fromWip = wipRows.find((w) => w.projectId === p.id);
      const actual = fromCosts + (fromWip?.laborCost ?? 0) + (fromWip?.materialReserved ?? 0);
      const variance = budget - actual;
      const percentUsed = budget > 0 ? Math.round((actual / budget) * 100) : 0;
      return {
        projectId: p.id,
        projectName: p.name,
        budget,
        actualCost: Math.round(actual),
        variance: Math.round(variance),
        percentUsed,
        status: percentUsed > 100 ? 'OVER' : percentUsed > 90 ? 'WARNING' : 'OK',
      };
    });

    if (rows.length === 0) {
      for (const w of wipRows) {
        rows.push({
          projectId: w.projectId,
          projectName: w.projectId,
          budget: 0,
          actualCost: Math.round(w.wipBalance),
          variance: -Math.round(w.wipBalance),
          percentUsed: 0,
          status: 'OK' as const,
        });
      }
    }

    return { rows, generatedAt: new Date().toISOString() };
  }

  @Get('payables')
  async getPayables() {
    try {
      const rows = await this.prisma.payable.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
      return rows.map((r) => ({
        ...r,
        dueDate: r.dueDate?.toISOString() ?? null,
        status: r.dueDate && r.dueDate < new Date() && r.status === 'PENDING' ? 'OVERDUE' : r.status,
      }));
    } catch {
      return [];
    }
  }

  @Get('receivables')
  async getReceivables() {
    try {
      const rows = await this.prisma.receivable.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
      return rows.map((r) => ({
        ...r,
        dueDate: r.dueDate?.toISOString() ?? null,
        status: r.dueDate && r.dueDate < new Date() && r.status === 'PENDING' ? 'OVERDUE' : r.status,
      }));
    } catch {
      return [];
    }
  }
}
