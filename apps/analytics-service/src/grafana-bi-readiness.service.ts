import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GrafanaBiReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'infra/grafana/dashboards/bi-snapshot-metrics.json'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const dashPath = path.join(this.findRepoRoot(), 'infra/grafana/dashboards/bi-snapshot-metrics.json');
    let dashboardFile = false;
    let coversMetrics = false;
    try {
      const raw = fs.readFileSync(dashPath, 'utf8');
      dashboardFile = true;
      coversMetrics =
        raw.includes('erp_bi_snapshot_total') &&
        raw.includes('erp_bi_snapshot_purged_last') &&
        raw.includes('erp_bi_snapshot_ttl_hours');
    } catch {
      dashboardFile = false;
    }

    let dashboardApiOk = false;
    try {
      const res = await fetch(`${this.analyticsBase}/bi/metrics/grafana/dashboard`, {
        signal: AbortSignal.timeout(8000),
      });
      const body = res.ok ? ((await res.json()) as { uid?: string; panels?: unknown[] }) : null;
      dashboardApiOk = res.ok && body?.uid === 'erp-bi-snapshot-metrics' && Array.isArray(body.panels);
    } catch {
      dashboardApiOk = false;
    }

    let promOk = false;
    try {
      const res = await fetch(`${this.analyticsBase}/bi/metrics/retention/prometheus`, {
        signal: AbortSignal.timeout(8000),
      });
      const text = res.ok ? await res.text() : '';
      promOk = res.ok && text.includes('erp_bi_snapshot_total');
    } catch {
      promOk = false;
    }

    const ready = dashboardFile && coversMetrics && dashboardApiOk && promOk;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : dashboardFile ? 'partial' : 'down',
      domain: 'GRAFANA_BI',
      dashboardFile,
      coversMetrics,
      dashboardApiOk,
      prometheusUp: promOk,
      dashboardPath: 'infra/grafana/dashboards/bi-snapshot-metrics.json',
      capabilities: ['Grafana dashboard JSON', 'BI snapshot panels', 'Prometheus scrape target'],
      checkedAt: new Date().toISOString(),
    };
  }
}
