import { Injectable } from '@nestjs/common';
import { BiSnapshotRetentionService } from './bi-snapshot-retention.service';
import { BiProjectionService } from './bi-projection.service';

@Injectable()
export class BiRetentionMetricsService {
  constructor(
    private readonly retention: BiSnapshotRetentionService,
    private readonly projection: BiProjectionService,
  ) {}

  async getMetricsJson() {
    const stats = await this.projection.snapshotStats();
    const status = this.retention.getStatus();
    return {
      source: 'bi-retention-metrics',
      snapshotTotal: stats.total,
      ttlHours: stats.ttlHours,
      persistence: stats.persistence,
      lastPurgeAt: status.lastPurgeAt,
      lastPurgedCount: status.lastPurgedCount,
      schedulerEnabled: status.enabled !== false,
      checkedAt: new Date().toISOString(),
    };
  }

  async getPrometheusText() {
    const m = await this.getMetricsJson();
    const lines = [
      '# HELP erp_bi_snapshot_total Total materialized BI project snapshots',
      '# TYPE erp_bi_snapshot_total gauge',
      `erp_bi_snapshot_total ${m.snapshotTotal}`,
      '# HELP erp_bi_snapshot_purged_last Last purge batch count',
      '# TYPE erp_bi_snapshot_purged_last gauge',
      `erp_bi_snapshot_purged_last ${m.lastPurgedCount}`,
      '# HELP erp_bi_snapshot_ttl_hours Configured TTL in hours',
      '# TYPE erp_bi_snapshot_ttl_hours gauge',
      `erp_bi_snapshot_ttl_hours ${m.ttlHours}`,
    ];
    return lines.join('\n') + '\n';
  }
}
