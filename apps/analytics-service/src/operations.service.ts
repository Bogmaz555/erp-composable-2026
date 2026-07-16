import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ServiceProbe {
  name: string;
  port: number;
  path: string;
  layer: 'direct' | 'gateway';
  status: 'UP' | 'DOWN' | 'DEGRADED';
  httpCode: number;
  latencyMs: number;
  url: string;
}

export interface RegressionSummary {
  generatedAt?: string;
  passed?: number;
  failed?: number;
  total?: number;
  score?: number;
}

@Injectable()
export class OperationsService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
  private readonly reportPath = path.join(
    process.cwd(),
    '.agents/swarm/regression-report.json',
  );

  private readonly directProbes = [
    { name: 'Gateway', port: 4005, path: '/api/health' },
    { name: 'CRM', port: 4001, path: '/health' },
    { name: 'PM', port: 4002, path: '/health' },
    { name: 'INV', port: 4003, path: '/health' },
    { name: 'PROC', port: 4004, path: '/health' },
    { name: 'PLM', port: 4007, path: '/health' },
    { name: 'MES', port: 4006, path: '/health' },
    { name: 'Finance', port: 4010, path: '/fin/health' },
    { name: 'Analytics', port: 4011, path: '/health' },
    { name: 'Quality', port: 4008, path: '/health' },
    { name: 'EAM', port: 4009, path: '/health' },
    { name: 'HR', port: 4012, path: '/hr/health' },
    { name: 'Tax-Legal', port: 4015, path: '/tax-legal/health' },
    { name: 'Frontend', port: 3001, path: '/' },
  ];

  private readonly gatewayProbes = [
    { name: 'GW→Finance FA', path: '/api/fin/fixed-assets' },
    { name: 'GW→PM', path: '/api/pm' },
    { name: 'GW→INV', path: '/api/inv/inventory' },
    { name: 'GW→HR', path: '/api/hr/employees' },
    { name: 'GW→JPK_KR', path: '/api/tax-legal/jpk/kr?year=2026&month=6' },
    { name: 'GW→Approvals', path: '/api/analytics/approvals?status=PENDING' },
    { name: 'GW→Mail Outbox', path: '/api/analytics/mail/outbox' },
  ];

  private async probe(url: string): Promise<{ code: number; ms: number }> {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      return { code: res.status, ms: Date.now() - t0 };
    } catch {
      return { code: 0, ms: Date.now() - t0 };
    }
  }

  private statusFromCode(code: number): ServiceProbe['status'] {
    if (code >= 200 && code < 400) return 'UP';
    if (code >= 400 && code < 500) return 'DEGRADED';
    return 'DOWN';
  }

  async getGatewayReadiness() {
    const probes: { name: string; path: string; ok: boolean; httpCode: number; latencyMs: number }[] = [];
    for (const p of this.gatewayProbes) {
      const url = `${this.gw}${p.path}`;
      const { code, ms } = await this.probe(url);
      probes.push({
        name: p.name,
        path: p.path,
        ok: code >= 200 && code < 400,
        httpCode: code,
        latencyMs: ms,
      });
    }
    const up = probes.filter((p) => p.ok).length;
    return {
      ready: up >= 3,
      td002: up >= 4 ? 'yellow-minimum' : up >= 2 ? 'partial' : 'down',
      proxyRoutesUp: up,
      proxyRoutesTotal: probes.length,
      probes,
      checkedAt: new Date().toISOString(),
    };
  }

  async getStackReadiness() {
    const fePort = this.frontendPort();
    const stackDefs: Array<{ name: string; group: string; port: number; path: string }> = [
      { name: 'Gateway', group: 'platform', port: 4005, path: '/api/health' },
      { name: 'Analytics', group: 'platform', port: 4011, path: '/health' },
      { name: 'CRM', group: 'commercial', port: 4001, path: '/health' },
      { name: 'PLM', group: 'manufacturing', port: 4007, path: '/health' },
      { name: 'PM', group: 'manufacturing', port: 4002, path: '/health' },
      { name: 'MES', group: 'manufacturing', port: 4006, path: '/health' },
      { name: 'INV', group: 'manufacturing', port: 4003, path: '/health' },
      { name: 'PROC', group: 'manufacturing', port: 4004, path: '/health' },
      { name: 'Finance', group: 'finance', port: 4010, path: '/fin/health' },
      { name: 'Tax-Legal', group: 'finance', port: 4015, path: '/tax-legal/health' },
      { name: 'Quality', group: 'platform', port: 4008, path: '/health' },
      { name: 'EAM', group: 'platform', port: 4009, path: '/health' },
      { name: 'HR', group: 'platform', port: 4012, path: '/hr/health' },
      { name: 'Frontend', group: 'platform', port: fePort, path: '/' },
    ];

    const services: Array<{
      name: string;
      group: string;
      port: number;
      ok: boolean;
      httpCode: number;
      latencyMs: number;
    }> = [];

    for (const s of stackDefs) {
      const base = s.name === 'Gateway' ? this.gw : `http://127.0.0.1:${s.port}`;
      const url = `${base}${s.path}`;
      const { code, ms } = await this.probe(url);
      services.push({
        name: s.name,
        group: s.group,
        port: s.port,
        ok: code >= 200 && code < 400,
        httpCode: code,
        latencyMs: ms,
      });
    }

    const up = services.filter((s) => s.ok).length;
    const mfg = services.filter((s) => s.group === 'manufacturing' && s.ok).length;
    const fin = services.filter((s) => s.group === 'finance' && s.ok).length;
    const regression = this.loadRegressionReport();

    return {
      ready: mfg >= 4 && services.find((s) => s.name === 'Gateway')?.ok && services.find((s) => s.name === 'Analytics')?.ok,
      td011: up >= 12 ? 'yellow-minimum' : up >= 8 ? 'partial' : 'down',
      servicesUp: up,
      servicesTotal: services.length,
      manufacturingUp: mfg,
      manufacturingTotal: 5,
      financeUp: fin,
      financeTotal: 2,
      frontendPort: fePort,
      groups: ['manufacturing', 'commercial', 'finance', 'platform'],
      services,
      regressionScore: regression?.score ?? null,
      bootHints: ['pnpm run boot:smart', 'bash scripts/ensure-core-stack.sh'],
      checkedAt: new Date().toISOString(),
    };
  }

  private frontendPort(): number {
    try {
      const portFile = '/tmp/erp-frontend.port';
      if (fs.existsSync(portFile)) {
        const p = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
        if (p > 0) return p;
      }
    } catch { /* ignore */ }
    return 3003;
  }

  async getCommandCenter() {
    const fePort = this.frontendPort();
    const services: ServiceProbe[] = [];

    for (const p of this.directProbes) {
      const port = p.name === 'Frontend' ? fePort : p.port;
      const url = `http://127.0.0.1:${port}${p.path}`;
      const { code, ms } = await this.probe(url);
      services.push({
        name: p.name,
        port: p.port === 3001 && p.name === 'Frontend' ? fePort : p.port,
        path: p.path,
        layer: 'direct',
        status: this.statusFromCode(code),
        httpCode: code,
        latencyMs: ms,
        url,
      });
    }

    for (const p of this.gatewayProbes) {
      const url = `${this.gw}${p.path}`;
      const { code, ms } = await this.probe(url);
      services.push({
        name: p.name,
        port: 4005,
        path: p.path,
        layer: 'gateway',
        status: this.statusFromCode(code),
        httpCode: code,
        latencyMs: ms,
        url,
      });
    }

    const up = services.filter((s) => s.status === 'UP').length;
    const degraded = services.filter((s) => s.status === 'DEGRADED').length;
    const down = services.filter((s) => s.status === 'DOWN').length;
    const regression = this.loadRegressionReport();

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: services.length,
        up,
        degraded,
        down,
        healthScore: Math.round((up / services.length) * 100),
        regressionScore: regression?.score ?? null,
      },
      services,
      regression,
      worker: {
        logPath: '.agents/swarm/continuous-worker.log',
        reportPath: '.agents/swarm/regression-report.json',
        commands: [
          'pnpm run worker:master',
          'pnpm run pipeline:full',
          'pnpm run regression:report',
        ],
      },
    };
  }

  loadRegressionReport(): RegressionSummary | null {
    try {
      const alt = path.join(process.cwd(), '..', '..', '.agents/swarm/regression-report.json');
      const p = fs.existsSync(this.reportPath) ? this.reportPath : alt;
      if (!fs.existsSync(p)) return null;
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      return {
        generatedAt: raw.generatedAt,
        passed: raw.passed,
        failed: raw.failed,
        total: raw.total,
        score: raw.score,
      };
    } catch {
      return null;
    }
  }
}
