import { Injectable } from '@nestjs/common';

@Injectable()
export class MesDomainReadinessService {
  private readonly mesBase = 'http://127.0.0.1:4006';

  private async probe(url: string): Promise<{ ok: boolean; code: number; body?: unknown }> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { ok: res.ok, code: res.status, body };
    } catch {
      return { ok: false, code: 0 };
    }
  }

  async getReadiness() {
    const health = await this.probe(`${this.mesBase}/health`);
    const eto = await this.probe(`${this.mesBase}/health/eto`);
    const routing = await this.probe(`${this.mesBase}/routing/aggregate`);
    const oee = await this.probe(`${this.mesBase}/oee/summary`);

    let workCenterCount = 0;
    let totalOperations = 0;
    if (routing.body && typeof routing.body === 'object') {
      const b = routing.body as Record<string, unknown>;
      workCenterCount = Number(b.workCenterCount ?? 0);
      totalOperations = Number(b.totalOperations ?? 0);
    }

    const score = [health.ok, eto.ok, routing.ok, oee.ok].filter(Boolean).length;

    return {
      ready: health.ok && routing.ok && score >= 3,
      td004: score >= 4 ? 'yellow-minimum' : score >= 2 ? 'partial' : 'down',
      domain: 'MES',
      healthUp: health.ok,
      etoUp: eto.ok,
      routingUp: routing.ok,
      oeeUp: oee.ok,
      workCenterCount,
      totalOperations,
      capabilities: ['routing aggregate by work center', 'OEE summary', 'ETO spine'],
      checkedAt: new Date().toISOString(),
    };
  }
}
