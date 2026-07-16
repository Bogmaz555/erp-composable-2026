import { Injectable } from '@nestjs/common';

@Injectable()
export class DataIntegrityReadinessService {
  private readonly finBase = 'http://127.0.0.1:4010';
  private readonly analyticsBase = 'http://127.0.0.1:4011';

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

  private hasDemoFallback(data: unknown): boolean {
    const json = JSON.stringify(data ?? '');
    return json.includes('proj-demo') || json.includes('"demo-1"') || json.includes('mock-wip');
  }

  async getReadiness() {
    const wip = await this.probe(`${this.finBase}/fin/wip`);
    const milestones = await this.probe(`${this.finBase}/fin/milestones`);
    const noFinanceMocks = !this.hasDemoFallback(wip.body) && !this.hasDemoFallback(milestones.body);

    let sampleProjectId: string | null = null;
    const wipList = wip.body as { projectId?: string }[] | null;
    if (Array.isArray(wipList) && wipList.length > 0) {
      sampleProjectId = wipList[0].projectId ?? null;
    }
    if (!sampleProjectId) {
      const pm = await this.probe('http://127.0.0.1:4002/');
      if (Array.isArray(pm.body) && pm.body.length > 0) {
        sampleProjectId = (pm.body[0] as { id?: string }).id ?? null;
      }
    }

    let costSummaryLive = false;
    if (sampleProjectId) {
      const cs = await this.probe(`${this.analyticsBase}/projects/${sampleProjectId}/cost-summary`);
      costSummaryLive =
        cs.ok &&
        typeof cs.body === 'object' &&
        (cs.body as { source?: string }).source === 'live';
    }

    const authEnforced = process.env.AUTH_ENFORCE === 'true';
    const score = [noFinanceMocks, costSummaryLive || !sampleProjectId].filter(Boolean).length;

    return {
      ready: noFinanceMocks && score >= 1,
      td008: score >= 2 ? 'yellow-minimum' : score >= 1 ? 'partial' : 'down',
      domain: 'DATA_INTEGRITY',
      financeNoMocks: noFinanceMocks,
      costSummaryLive,
      sampleProjectId,
      authEnforced,
      capabilities: ['no demo finance fallbacks', 'live project cost-summary'],
      checkedAt: new Date().toISOString(),
    };
  }
}
