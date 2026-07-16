import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FrontendBiReadinessService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
  private readonly finBase = 'http://127.0.0.1:4010';
  private readonly pmBase = 'http://127.0.0.1:4002';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'apps/frontend/app/actions/analytics.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private async probe(url: string) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
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
    let frontendActionWired = false;
    try {
      const src = fs.readFileSync(
        path.join(this.findRepoRoot(), 'apps/frontend/app/actions/analytics.ts'),
        'utf8',
      );
      frontendActionWired = src.includes('bi/projects') && src.includes('getProjectBiDashboard');
    } catch {
      frontendActionWired = false;
    }

    let hookWired = false;
    try {
      const hook = fs.readFileSync(
        path.join(this.findRepoRoot(), 'apps/frontend/hooks/useBiDashboard.ts'),
        'utf8',
      );
      hookWired = hook.includes('useBiDashboard');
    } catch {
      hookWired = false;
    }

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

    let gatewayDashboardOk = false;
    if (sampleProjectId) {
      const dash = await this.probe(
        `${this.gw}/api/analytics/bi/projects/${sampleProjectId}/dashboard`,
      );
      gatewayDashboardOk =
        dash.ok &&
        typeof dash.body === 'object' &&
        (dash.body as { source?: string }).source === 'read-model';
    }

    const ready = frontendActionWired && hookWired && gatewayDashboardOk;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : frontendActionWired ? 'partial' : 'down',
      domain: 'FRONTEND_BI',
      sampleProjectId,
      frontendActionWired,
      hookWired,
      gatewayDashboardOk,
      capabilities: ['server action getProjectBiDashboard', 'useBiDashboard hook', 'gateway BI route'],
      checkedAt: new Date().toISOString(),
    };
  }
}
