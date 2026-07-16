import { Injectable } from '@nestjs/common';
import { BiRefreshSchedulerService } from './bi-refresh-scheduler.service';

@Injectable()
export class BiSchedulerReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  constructor(private readonly scheduler: BiRefreshSchedulerService) {}

  private async probe(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { ok: res.ok, body };
    } catch {
      return { ok: false, body: undefined };
    }
  }

  async getReadiness() {
    const statusBefore = this.scheduler.getStatus();
    if (!statusBefore.lastRunAt) {
      await this.scheduler.refreshActiveProjects();
    }
    const tick = await this.probe(`${this.analyticsBase}/bi/scheduler/tick`, { method: 'POST' });
    const status =
      tick.body && typeof tick.body === 'object'
        ? (tick.body as { lastRunAt?: string; lastRefreshCount?: number; enabled?: boolean })
        : this.scheduler.getStatus();

    const schedulerUp =
      !!status.lastRunAt &&
      typeof status.lastRefreshCount === 'number' &&
      status.enabled !== false;
    const persistenceOk = this.scheduler.getStatus().persistence === 'prisma';

    return {
      ready: schedulerUp && persistenceOk,
      td011: schedulerUp && persistenceOk ? 'yellow-minimum' : schedulerUp ? 'partial' : 'down',
      domain: 'BI_SCHEDULER',
      schedulerEnabled: status.enabled !== false,
      lastRunAt: status.lastRunAt ?? null,
      lastRefreshCount: status.lastRefreshCount ?? 0,
      persistenceMode: this.scheduler.getStatus().persistence,
      capabilities: ['scheduled BI refresh', 'manual tick', 'Prisma snapshots'],
      checkedAt: new Date().toISOString(),
    };
  }
}
