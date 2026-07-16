import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BiProjectionService } from './bi-projection.service';

@Injectable()
export class BiProjectionReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';
  private readonly finBase = 'http://127.0.0.1:4010';
  private readonly pmBase = 'http://127.0.0.1:4002';

  constructor(private readonly projection: BiProjectionService) {}

  private async probe(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
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

    let snapshotOk = false;
    if (sampleProjectId) {
      const refresh = await this.probe(
        `${this.analyticsBase}/bi/projects/${sampleProjectId}/refresh`,
        { method: 'POST' },
      );
      const snap = await this.probe(
        `${this.analyticsBase}/bi/projects/${sampleProjectId}/snapshot`,
      );
      snapshotOk =
        refresh.ok &&
        snap.ok &&
        typeof snap.body === 'object' &&
        (snap.body as { found?: boolean }).found === true &&
        (snap.body as { source?: string }).source === 'materialized';
    }

    const persistenceMode = this.projection.getPersistenceMode();
    const ready = persistenceMode === 'prisma' && snapshotOk;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : persistenceMode === 'prisma' ? 'partial' : 'down',
      domain: 'BI_PROJECTION',
      sampleProjectId,
      persistenceMode,
      snapshotMaterialized: snapshotOk,
      capabilities: ['materialized BI snapshot', 'refresh on demand', 'Prisma persistence'],
      checkedAt: new Date().toISOString(),
    };
  }
}
