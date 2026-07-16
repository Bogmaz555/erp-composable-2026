import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BiProjectionService } from './bi-projection.service';

@Injectable()
export class BiRefreshSchedulerService {
  private readonly logger = new Logger(BiRefreshSchedulerService.name);
  private lastRunAt: string | null = null;
  private lastRefreshCount = 0;
  private readonly enabled = process.env.BI_SCHEDULER_ENABLED !== 'false';
  private readonly intervalMs = Number(process.env.BI_SCHEDULER_INTERVAL_MS || 60000);
  private readonly pmBase = 'http://127.0.0.1:4002';
  private readonly finBase = 'http://127.0.0.1:4010';

  constructor(private readonly projection: BiProjectionService) {}

  getStatus() {
    return {
      enabled: this.enabled,
      intervalMs: this.intervalMs,
      lastRunAt: this.lastRunAt,
      lastRefreshCount: this.lastRefreshCount,
      persistence: this.projection.getPersistenceMode(),
    };
  }

  async refreshActiveProjects() {
    if (!this.enabled) return this.getStatus();
    const ids = await this.fetchProjectIds();
    let count = 0;
    for (const id of ids.slice(0, 5)) {
      try {
        await this.projection.refresh(id);
        count++;
      } catch (e) {
        this.logger.warn(`BI refresh failed for ${id}: ${(e as Error).message}`);
      }
    }
    this.lastRunAt = new Date().toISOString();
    this.lastRefreshCount = count;
    return this.getStatus();
  }

  @Interval(60000)
  async scheduledTick() {
    await this.refreshActiveProjects();
  }

  private async fetchProjectIds(): Promise<string[]> {
    const ids = new Set<string>();
    try {
      const wip = await fetch(`${this.finBase}/fin/wip`, { signal: AbortSignal.timeout(6000) });
      if (wip.ok) {
        const body = (await wip.json()) as { projectId?: string }[];
        if (Array.isArray(body)) {
          for (const row of body) {
            if (row.projectId) ids.add(row.projectId);
          }
        }
      }
    } catch {
      /* optional finance */
    }
    try {
      const pm = await fetch(`${this.pmBase}/`, { signal: AbortSignal.timeout(6000) });
      if (pm.ok) {
        const body = (await pm.json()) as { id?: string }[];
        if (Array.isArray(body)) {
          for (const row of body) {
            if (row.id) ids.add(row.id);
          }
        }
      }
    } catch {
      /* optional pm */
    }
    return [...ids];
  }
}
