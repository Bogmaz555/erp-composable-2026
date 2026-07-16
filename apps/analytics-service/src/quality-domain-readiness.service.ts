import { Injectable } from '@nestjs/common';

@Injectable()
export class QualityDomainReadinessService {
  private readonly qualityBase = 'http://127.0.0.1:4008';

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
    const health = await this.probe(`${this.qualityBase}/health`);
    const ncrs = await this.probe(`${this.qualityBase}/ncrs`);
    const capaAgg = await this.probe(`${this.qualityBase}/capa/aggregate`);

    let ncrCount = 0;
    let capaCount = 0;
    if (capaAgg.body && typeof capaAgg.body === 'object') {
      const b = capaAgg.body as Record<string, number>;
      ncrCount = Number(b.ncrCount ?? 0);
      capaCount = Number(b.capaCount ?? 0);
    }

    const score = [health.ok, ncrs.ok, capaAgg.ok].filter(Boolean).length;

    return {
      ready: health.ok && capaAgg.ok && score >= 2,
      td004: score >= 3 ? 'yellow-minimum' : score >= 2 ? 'partial' : 'down',
      domain: 'QUALITY',
      healthUp: health.ok,
      ncrsUp: ncrs.ok,
      capaAggregateUp: capaAgg.ok,
      ncrCount,
      capaCount,
      capabilities: ['NCR/CAPA aggregate', 'SPC', 'ISO 9001 docs'],
      checkedAt: new Date().toISOString(),
    };
  }
}
