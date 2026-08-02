import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

export class PeriodClosedError extends Error {
  readonly periodCode: string;
  readonly status: string;

  constructor(periodCode: string, status = 'CLOSED') {
    super(`Accounting period ${periodCode} is ${status} — postings refused`);
    this.name = 'PeriodClosedError';
    this.periodCode = periodCode;
    this.status = status;
  }
}

/** Current UTC calendar period key YYYY-MM */
export function currentPeriodKey(at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function periodCode(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Enterprise Q2 KD-Q2-1 — formal period close.
 * Postings (journal, WIP reverse, revenue, AR/AP) refuse CLOSED periods.
 */
@Injectable()
export class PeriodCloseService {
  private readonly logger = new Logger(PeriodCloseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Ensure OPEN period row for calendar month (idempotent). */
  async ensureOpenPeriod(tenantId = 'default', at: Date = new Date()) {
    const periodKey = currentPeriodKey(at);
    return this.prisma.accountingPeriod.upsert({
      where: { tenantId_periodKey: { tenantId, periodKey } },
      update: {},
      create: {
        tenantId,
        periodKey,
        status: 'OPEN',
      },
    });
  }

  async getPeriod(tenantId: string, periodKey: string) {
    return this.prisma.accountingPeriod.findUnique({
      where: { tenantId_periodKey: { tenantId, periodKey } },
    });
  }

  async getPeriodByYearMonth(tenantId: string, year: number, month: number) {
    return this.getPeriod(tenantId, periodCode(year, month));
  }

  async list(tenantId = 'default', take = 36) {
    return this.prisma.accountingPeriod.findMany({
      where: { tenantId },
      orderBy: { periodKey: 'desc' },
      take,
    });
  }

  /**
   * Hard guard for all money-moving posts.
   * Missing period → auto-create OPEN (first post in month).
   * CLOSING | CLOSED → throw PeriodClosedError.
   */
  async assertOpenForPosting(tenantId = 'default', at: Date = new Date()) {
    const period = await this.ensureOpenPeriod(tenantId, at);
    if (period.status === 'CLOSED') {
      throw new PeriodClosedError(period.periodKey, 'CLOSED');
    }
    if (period.status === 'CLOSING') {
      throw new PeriodClosedError(period.periodKey, 'CLOSING');
    }
    return period;
  }

  /**
   * Alias used by journal / reverse-wip handlers.
   * Throws Nest BadRequestException when CLOSED for HTTP-friendly tests.
   */
  async assertPostingAllowed(tenantId = 'default', at: Date = new Date()) {
    try {
      await this.assertOpenForPosting(tenantId, at);
    } catch (e) {
      if (e instanceof PeriodClosedError) {
        throw new BadRequestException({
          error: 'PERIOD_CLOSED',
          message: e.message,
          periodKey: e.periodCode,
          status: e.status,
        });
      }
      throw e;
    }
  }

  /** Nest HTTP-friendly wrapper → ConflictException. */
  async assertOpenOrHttp(tenantId = 'default', at?: Date) {
    try {
      return await this.assertOpenForPosting(tenantId, at ?? new Date());
    } catch (e) {
      if (e instanceof PeriodClosedError) {
        throw new ConflictException({
          error: 'PERIOD_CLOSED',
          message: e.message,
          periodCode: e.periodCode,
          status: e.status,
        });
      }
      throw e;
    }
  }

  async beginClose(tenantId: string, year: number, month: number, actor: string) {
    if (month < 1 || month > 12) throw new BadRequestException('month must be 1..12');
    const periodKey = periodCode(year, month);
    return this.beginCloseKey(tenantId, periodKey, actor);
  }

  async beginCloseKey(tenantId: string, periodKey: string, actor: string) {
    const period = await this.ensureOpenPeriod(
      tenantId,
      this.dateFromPeriodKey(periodKey),
    );
    if (period.status === 'CLOSED') {
      throw new ConflictException(`Period ${period.periodKey} already CLOSED`);
    }
    const updated = await this.prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { status: 'CLOSING', notes: `begin-close by ${actor}` },
    });
    this.logger.log(`[Period] ${period.periodKey} → CLOSING by ${actor}`);
    return updated;
  }

  async closePeriod(
    tenantId: string,
    year: number,
    month: number,
    actor: string,
    notes?: string,
  ) {
    if (month < 1 || month > 12) throw new BadRequestException('month must be 1..12');
    return this.close(tenantId, periodCode(year, month), actor, notes);
  }

  /** Close by periodKey (YYYY-MM) with actor audit — used by tests + admin API. */
  async close(tenantId: string, periodKey: string, actor: string, notes?: string) {
    const period = await this.ensureOpenPeriod(
      tenantId,
      this.dateFromPeriodKey(periodKey),
    );
    if (period.status === 'CLOSED') {
      return { ...period, idempotent: true };
    }
    const updated = await this.prisma.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: actor,
        notes: notes || `closed by ${actor}`,
      },
    });
    this.logger.warn(`[Period] ${period.periodKey} CLOSED by ${actor}`);
    return { ...updated, idempotent: false };
  }

  async reopenPeriod(tenantId: string, year: number, month: number, actor: string) {
    return this.reopen(tenantId, periodCode(year, month), actor);
  }

  async reopen(tenantId: string, periodKey: string, actor: string) {
    const period = await this.getPeriod(tenantId, periodKey);
    if (!period) throw new NotFoundException(`Period ${periodKey} not found`);
    if (period.status === 'OPEN') {
      return { ...period, idempotent: true };
    }
    const updated = await this.prisma.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: 'OPEN',
        closedAt: null,
        closedBy: null,
        notes: `reopened by ${actor}`,
      },
    });
    this.logger.warn(`[Period] ${period.periodKey} REOPENED by ${actor}`);
    return { ...updated, idempotent: false };
  }

  private dateFromPeriodKey(periodKey: string): Date {
    const [ys, ms] = periodKey.split('-');
    const y = parseInt(ys, 10);
    const m = parseInt(ms, 10);
    if (!y || !m) throw new BadRequestException(`Invalid periodKey ${periodKey}`);
    return new Date(Date.UTC(y, m - 1, 1));
  }
}
