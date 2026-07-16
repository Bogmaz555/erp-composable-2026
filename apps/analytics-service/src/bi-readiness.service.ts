import { Injectable } from '@nestjs/common';

@Injectable()
export class BiReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';
  private readonly finBase = 'http://127.0.0.1:4010';
  private readonly pmBase = 'http://127.0.0.1:4002';

  private async probe(url: string) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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
    let sampleProjectId: string | null = null;
    const wip = await this.probe(`${this.finBase}/fin/wip`);
    if (Array.isArray(wip.body) && wip.body.length > 0) {
      sampleProjectId = (wip.body[0] as { projectId?: string }).projectId ?? null;
    }
    if (!sampleProjectId) {
      const pm = await this.probe(`${this.pmBase}/`);
      if (Array.isArray(pm.body) && pm.body.length > 0) {
        sampleProjectId = (pm.body[0] as { id?: string }).id ?? null;
      }
    }

    let dashboardOk = false;
    if (sampleProjectId) {
      const dash = await this.probe(
        `${this.analyticsBase}/bi/projects/${sampleProjectId}/dashboard`,
      );
      dashboardOk =
        dash.ok &&
        typeof dash.body === 'object' &&
        (dash.body as { source?: string }).source === 'read-model' &&
        !!(dash.body as { cost?: unknown }).cost;
    }

    const costProbe = sampleProjectId
      ? await this.probe(`${this.analyticsBase}/projects/${sampleProjectId}/cost-summary`)
      : { ok: false, body: undefined };
    const costSummaryLinked =
      costProbe.ok && (costProbe.body as { source?: string })?.source === 'live';

    const ready = dashboardOk || (!sampleProjectId && costSummaryLinked);

    return {
      ready,
      td011: dashboardOk ? 'yellow-minimum' : costSummaryLinked ? 'partial' : 'down',
      domain: 'BI_READ_MODEL',
      sampleProjectId,
      dashboardUp: dashboardOk,
      costSummaryLinked,
      capabilities: ['project BI dashboard', 'live cost-summary linkage', 'MES/Quality aggregates'],
      checkedAt: new Date().toISOString(),
    };
  }
}
