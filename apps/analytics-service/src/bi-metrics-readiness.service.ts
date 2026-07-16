import { Injectable } from '@nestjs/common';

@Injectable()
export class BiMetricsReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  async getReadiness() {
    let jsonOk = false;
    let snapshotTotal: number | null = null;
    try {
      const res = await fetch(`${this.analyticsBase}/bi/metrics/retention`, {
        signal: AbortSignal.timeout(10000),
      });
      const body = res.ok ? ((await res.json()) as Record<string, unknown>) : null;
      jsonOk =
        res.ok &&
        body?.source === 'bi-retention-metrics' &&
        typeof body.snapshotTotal === 'number';
      snapshotTotal = jsonOk ? (body!.snapshotTotal as number) : null;
    } catch {
      jsonOk = false;
    }

    let promOk = false;
    try {
      const res = await fetch(`${this.analyticsBase}/bi/metrics/retention/prometheus`, {
        signal: AbortSignal.timeout(10000),
      });
      const text = res.ok ? await res.text() : '';
      promOk = res.ok && text.includes('erp_bi_snapshot_total');
    } catch {
      promOk = false;
    }

    return {
      ready: jsonOk && promOk,
      td011: jsonOk && promOk ? 'yellow-minimum' : jsonOk ? 'partial' : 'down',
      domain: 'BI_METRICS',
      jsonMetricsUp: jsonOk,
      prometheusUp: promOk,
      snapshotTotal,
      capabilities: ['JSON retention metrics', 'Prometheus text exposition'],
      checkedAt: new Date().toISOString(),
    };
  }
}
