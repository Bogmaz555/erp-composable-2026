import { Injectable } from '@nestjs/common';

export interface TaxProbe {
  name: string;
  path: string;
  ok: boolean;
  httpCode: number;
  latencyMs: number;
  detail?: string;
}

@Injectable()
export class TaxReadinessService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
  private readonly period = { year: 2026, month: 6 };

  private readonly probes = [
    { name: 'Tax health', path: '/api/tax-legal/health' },
    { name: 'KSeF status', path: '/api/tax-legal/ksef/status' },
    { name: 'JPK_KR export', path: '/api/tax-legal/jpk/kr?year=2026&month=6' },
    { name: 'JPK_KR validate', path: '/api/tax-legal/jpk/kr/validate?year=2026&month=6' },
    { name: 'JPK_V7 sales', path: '/api/tax-legal/jpk/v7?year=2026&month=6' },
  ];

  private async probe(path: string): Promise<{ code: number; ms: number; body?: unknown }> {
    const t0 = Date.now();
    try {
      const res = await fetch(`${this.gw}${path}`, { signal: AbortSignal.timeout(8000) });
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
    const results: TaxProbe[] = [];
    let ksefMode = 'unknown';

    for (const p of this.probes) {
      const { code, ms, body } = await this.probe(p.path);
      const ok = code >= 200 && code < 400;
      let detail: string | undefined;
      if (p.name === 'KSeF status' && body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        ksefMode = String(b.mode ?? b.status ?? 'unknown');
        detail = ksefMode;
      }
      if (p.name === 'JPK_KR validate' && body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        detail = b.valid === true ? 'valid' : b.valid === false ? 'invalid' : undefined;
      }
      results.push({ name: p.name, path: p.path, ok, httpCode: code, latencyMs: ms, detail });
    }

    const up = results.filter((r) => r.ok).length;
    const jpkUp = results.filter((r) => r.name.startsWith('JPK') && r.ok).length;

    return {
      ready: up >= 3 && results.find((r) => r.name === 'Tax health')?.ok,
      td005: up >= 4 ? 'yellow-minimum' : up >= 2 ? 'partial' : 'down',
      ksefMode,
      ksefEnvGated: ksefMode === 'sandbox' || ksefMode === 'production',
      probesUp: up,
      probesTotal: results.length,
      jpkReady: jpkUp >= 2,
      period: this.period,
      probes: results,
      capabilities: ['KSeF milestone invoice', 'JPK_KR ledger', 'JPK_V7 sales register'],
      checkedAt: new Date().toISOString(),
    };
  }
}
