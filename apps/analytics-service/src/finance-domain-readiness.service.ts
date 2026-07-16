import { Injectable } from '@nestjs/common';

@Injectable()
export class FinanceDomainReadinessService {
  private readonly finBase = 'http://127.0.0.1:4010';

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
    const health = await this.probe(`${this.finBase}/fin/health`);
    const wip = await this.probe(`${this.finBase}/fin/wip`);
    const budget = await this.probe(`${this.finBase}/fin/budget-variance`);

    let sampleProjectId: string | null = null;
    const wipList = wip.body as { projectId?: string }[] | null;
    if (Array.isArray(wipList) && wipList.length > 0) {
      sampleProjectId = wipList[0].projectId ?? null;
    }

    let breakdownOk = false;
    if (sampleProjectId) {
      const bd = await this.probe(`${this.finBase}/fin/projects/${sampleProjectId}/wip-breakdown`);
      breakdownOk = bd.ok;
    } else {
      breakdownOk = health.ok;
    }

    const score = [health.ok, wip.ok, breakdownOk, budget.ok].filter(Boolean).length;

    return {
      ready: health.ok && breakdownOk && score >= 3,
      td004: score >= 4 ? 'yellow-minimum' : score >= 2 ? 'partial' : 'down',
      domain: 'FINANCE',
      healthUp: health.ok,
      wipUp: wip.ok,
      breakdownUp: breakdownOk,
      budgetVarianceUp: budget.ok,
      sampleProjectId,
      capabilities: ['project WIP breakdown', 'budget vs actual', 'milestone billing'],
      checkedAt: new Date().toISOString(),
    };
  }
}
