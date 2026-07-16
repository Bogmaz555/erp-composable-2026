import { Injectable } from '@nestjs/common';
import { BiSnapshotRetentionService } from './bi-snapshot-retention.service';
import { BiProjectionService } from './bi-projection.service';

@Injectable()
export class BiRetentionReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  constructor(
    private readonly retention: BiSnapshotRetentionService,
    private readonly projection: BiProjectionService,
  ) {}

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
    const stats = await this.projection.snapshotStats();
    const purge = await this.probe(`${this.analyticsBase}/bi/snapshots/purge`, { method: 'POST' });
    const status = this.retention.getStatus();

    const retentionUp =
      purge.ok &&
      typeof purge.body === 'object' &&
      typeof (purge.body as { ttlHours?: number }).ttlHours === 'number';
    const persistenceOk = this.projection.getPersistenceMode() === 'prisma';

    return {
      ready: retentionUp && persistenceOk && status.enabled !== false,
      td011: retentionUp && persistenceOk ? 'yellow-minimum' : retentionUp ? 'partial' : 'down',
      domain: 'BI_RETENTION',
      ttlHours: stats.ttlHours,
      snapshotTotal: stats.total,
      lastPurgeAt: status.lastPurgeAt,
      lastPurgedCount: status.lastPurgedCount,
      persistenceMode: this.projection.getPersistenceMode(),
      capabilities: ['TTL snapshot purge', 'scheduled retention', 'manual purge endpoint'],
      checkedAt: new Date().toISOString(),
    };
  }
}
