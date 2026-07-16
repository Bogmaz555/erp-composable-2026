import { Injectable } from '@nestjs/common';

@Injectable()
export class EamDomainReadinessService {
  private readonly eamBase = 'http://127.0.0.1:4009';

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
    const health = await this.probe(`${this.eamBase}/health`);
    const maintAgg = await this.probe(`${this.eamBase}/eam/maintenance/aggregate`);
    const iot = await this.probe(`${this.eamBase}/eam/iot/status`);

    let equipmentCount = 0;
    let availabilityPct = 0;
    if (maintAgg.body && typeof maintAgg.body === 'object') {
      const b = maintAgg.body as Record<string, number>;
      equipmentCount = Number(b.equipmentCount ?? 0);
      availabilityPct = Number(b.availabilityPct ?? 0);
    }

    const score = [health.ok, maintAgg.ok, iot.ok].filter(Boolean).length;

    return {
      ready: health.ok && maintAgg.ok && score >= 2,
      td004: score >= 3 ? 'yellow-minimum' : score >= 2 ? 'partial' : 'down',
      domain: 'EAM',
      healthUp: health.ok,
      maintenanceAggregateUp: maintAgg.ok,
      iotUp: iot.ok,
      equipmentCount,
      availabilityPct,
      capabilities: ['maintenance aggregate', 'IoT breakdown lite', 'equipment lifecycle'],
      checkedAt: new Date().toISOString(),
    };
  }
}
