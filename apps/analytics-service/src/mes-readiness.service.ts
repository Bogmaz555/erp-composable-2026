import { Injectable } from '@nestjs/common';

@Injectable()
export class MesReadinessService {
  private readonly mesBase = 'http://127.0.0.1:4006';
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

  private async probe(url: string): Promise<{ code: number; ms: number; body?: unknown }> {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { code: res.status, ms: Date.now() - t0, body };
    } catch {
      return { code: 0, ms: Date.now() - t0 };
    }
  }

  async getReadiness() {
    const probes = [
      { name: 'MES liveness', url: `${this.mesBase}/health` },
      { name: 'MES DB ready', url: `${this.mesBase}/health/ready` },
      { name: 'MES ETO spine', url: `${this.mesBase}/health/eto` },
      { name: 'GW→MES compensation', url: `${this.gw}/api/mes/compensation/status` },
    ];

    const results: Array<{ name: string; ok: boolean; httpCode: number; latencyMs: number; detail?: string }> = [];
    let workOrderCount = 0;

    for (const p of probes) {
      const { code, ms, body } = await this.probe(p.url);
      const ok = code >= 200 && code < 400 || (p.name.includes('compensation') && code >= 200);
      let detail: string | undefined;
      if (p.name === 'MES ETO spine' && body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        workOrderCount = Number(b.workOrderCount ?? 0);
        detail = `${workOrderCount} WO`;
      }
      results.push({ name: p.name, ok, httpCode: code, latencyMs: ms, detail });
    }

    const up = results.filter((r) => r.ok).length;
    const etoOk = results.find((r) => r.name === 'MES ETO spine')?.ok;

    return {
      ready: etoOk && up >= 2,
      td004: up >= 3 ? 'yellow-minimum' : up >= 2 ? 'partial' : 'down',
      workOrderCount,
      probesUp: up,
      probesTotal: results.length,
      probes: results,
      checkedAt: new Date().toISOString(),
    };
  }
}
