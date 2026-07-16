import { Injectable } from '@nestjs/common';

@Injectable()
export class ProcDomainReadinessService {
  private readonly procBase = 'http://127.0.0.1:4004';

  private async probe(url: string) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      let body: unknown;
      try { body = await res.json(); } catch { body = undefined; }
      return { ok: res.ok, body };
    } catch {
      return { ok: false, body: undefined };
    }
  }

  async getReadiness() {
    const health = await this.probe(`${this.procBase}/health`);
    const mrpAgg = await this.probe(`${this.procBase}/mrp/aggregate`);
    const radar = await this.probe(`${this.procBase}/long-lead/radar`);

    let poCount = 0;
    let netPositive = 0;
    if (mrpAgg.body && typeof mrpAgg.body === 'object') {
      const b = mrpAgg.body as Record<string, number>;
      poCount = Number(b.purchaseOrderCount ?? 0);
      netPositive = Number(b.netPositiveLines ?? 0);
    }

    const score = [health.ok, mrpAgg.ok, radar.ok].filter(Boolean).length;

    return {
      ready: health.ok && mrpAgg.ok && score >= 2,
      td004: score >= 3 ? 'yellow-minimum' : score >= 2 ? 'partial' : 'down',
      domain: 'PROCUREMENT',
      healthUp: health.ok,
      mrpAggregateUp: mrpAgg.ok,
      longLeadUp: radar.ok,
      purchaseOrderCount: poCount,
      netPositiveLines: netPositive,
      capabilities: ['MRP II aggregate', 'long-lead radar', 'PO lifecycle'],
      checkedAt: new Date().toISOString(),
    };
  }
}
