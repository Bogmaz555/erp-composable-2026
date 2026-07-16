import { Injectable } from '@nestjs/common';

@Injectable()
export class PlmDomainReadinessService {
  private readonly plmBase = 'http://127.0.0.1:4007';
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

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
    const items = await this.probe(`${this.plmBase}/items`);
    const boms = await this.probe(`${this.plmBase}/boms`);
    const ecos = await this.probe(`${this.plmBase}/ecos`);

    let explosionOk = false;
    let ecoImpactOk = false;
    let sampleBomVersionId: string | null = null;
    let sampleEcoId: string | null = null;

    const bomList = boms.body as { id?: string; bomVersionId?: string }[] | { rows?: unknown[] } | null;
    const bomArray = Array.isArray(bomList) ? bomList : [];
    if (bomArray.length > 0) {
      sampleBomVersionId = (bomArray[0] as { id?: string; bomVersionId?: string }).bomVersionId
        || (bomArray[0] as { id?: string }).id
        || null;
    }

    if (sampleBomVersionId) {
      const exp = await this.probe(`${this.plmBase}/boms/versions/${sampleBomVersionId}/explosion`);
      explosionOk = exp.ok;
    }

    const ecoList = ecos.body as { id?: string }[] | null;
    if (Array.isArray(ecoList) && ecoList.length > 0) {
      sampleEcoId = ecoList[0].id ?? null;
      if (sampleEcoId) {
        const imp = await this.probe(`${this.plmBase}/ecos/${sampleEcoId}/impact`);
        ecoImpactOk = imp.ok;
      }
    } else {
      ecoImpactOk = ecos.ok;
    }

    const gwPlm = await this.probe(`${this.gw}/api/plm/boms`);

    const capabilities = ['multi-level BOM explosion', 'ECO impact analysis', 'double-BOM subAssembly'];
    const score = [items.ok, boms.ok, explosionOk || !sampleBomVersionId, ecoImpactOk].filter(Boolean).length;

    return {
      ready: items.ok && boms.ok && score >= 3,
      td004: score >= 4 ? 'yellow-minimum' : score >= 2 ? 'partial' : 'down',
      domain: 'PLM',
      itemsUp: items.ok,
      bomsUp: boms.ok,
      explosionUp: explosionOk,
      ecoImpactUp: ecoImpactOk,
      sampleBomVersionId,
      sampleEcoId,
      gwPlmUp: gwPlm.ok,
      capabilities,
      checkedAt: new Date().toISOString(),
    };
  }
}
