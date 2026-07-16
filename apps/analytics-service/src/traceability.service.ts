import { Injectable } from '@nestjs/common';

export interface TraceabilitySpine {
  serialOrLot: string;
  tenantId: string;
  generatedAt: string;
  genealogy: { count: number; links: unknown[]; status: string };
  manufacturing: { workOrders: unknown[]; status: string; workOrderCount?: number };
  finance: { wipAccounts: unknown[]; journalHints: unknown[]; status: string };
  spineComplete: boolean;
}

@Injectable()
export class TraceabilityService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
  private readonly demoSerial = 'SN-MACHINE-ETO-001';

  private async fetchJson(url: string, tenantId: string): Promise<{ ok: boolean; data: unknown }> {
    try {
      const res = await fetch(url, {
        headers: { 'X-Tenant-Id': tenantId },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { ok: false, data: null };
      return { ok: true, data: await res.json() };
    } catch {
      return { ok: false, data: null };
    }
  }

  async getSpine(serialOrLot: string, tenantId = 'default'): Promise<TraceabilitySpine> {
    const enc = encodeURIComponent(serialOrLot);

    const genRes = await this.fetchJson(
      `${this.gw}/api/inv/inventory/genealogy/forward/${enc}?tenantId=${tenantId}`,
      tenantId,
    );
    const genData = genRes.data as { links?: unknown[]; count?: number } | null;
    const links = genData?.links ?? [];

    const mesRes = await this.fetchJson('http://127.0.0.1:4006/health/eto', tenantId);
    const mesEto = mesRes.data as { workOrderCount?: number; ready?: boolean } | null;
    const workOrders = mesEto?.workOrderCount != null
      ? Array.from({ length: Math.min(mesEto.workOrderCount, 5) }, (_, i) => ({ id: `wo-${i}` }))
      : [];

    const typedLinks = links as Array<{ workOrderId?: string }>;
    const woIds = new Set(typedLinks.map((l) => l.workOrderId).filter((id): id is string => !!id));
    const relatedWo = workOrders.length > 0 ? workOrders : (woIds.size > 0 ? [...woIds].map((id) => ({ id })) : []);

    const finRes = await this.fetchJson(`${this.gw}/api/fin/wip`, tenantId);
    const wipAccounts = Array.isArray(finRes.data) ? finRes.data : [];

    const journalRes = await this.fetchJson(`${this.gw}/api/fin/journal`, tenantId);
    const journal = Array.isArray(journalRes.data) ? journalRes.data : [];
    const journalHints = (journal as Array<{ referenceId?: string; source?: string }>)
      .filter((j) =>
        woIds.size === 0 || [...woIds].some((id) => j.referenceId?.includes(id)),
      )
      .slice(0, 10);

    const spineComplete = genRes.ok && links.length > 0;

    return {
      serialOrLot,
      tenantId,
      generatedAt: new Date().toISOString(),
      genealogy: {
        count: genData?.count ?? links.length,
        links: links.slice(0, 20),
        status: genRes.ok ? 'ok' : 'unavailable',
      },
      manufacturing: {
        workOrders: relatedWo.length ? relatedWo : workOrders.slice(0, 5),
        status: mesRes.ok ? 'ok' : 'unavailable',
        workOrderCount: mesEto?.workOrderCount ?? relatedWo.length,
      },
      finance: {
        wipAccounts: wipAccounts.slice(0, 10),
        journalHints,
        status: finRes.ok ? 'ok' : 'unavailable',
      },
      spineComplete,
    };
  }

  /** W39 — ETO genealogy end-to-end readiness (spine + chain) */
  async getE2eReadiness(tenantId = 'default') {
    const serial = this.demoSerial;
    const enc = encodeURIComponent(serial);

    const [spine, chain, forward] = await Promise.all([
      this.getSpine(serial, tenantId),
      this.fetchJson(`${this.gw}/api/inv/inventory/genealogy/chain/${enc}`, tenantId),
      this.fetchJson(`${this.gw}/api/inv/inventory/genealogy/forward/${enc}`, tenantId),
    ]);

    const chainData = chain.data as { links?: unknown[]; summary?: Record<string, unknown> } | null;
    const chainLinks = chainData?.links ?? [];
    const forwardLinks = (forward.data as { links?: unknown[] } | null)?.links ?? [];

    const genealogyOk = forward.ok && forwardLinks.length > 0;
    const chainOk = chain.ok && chainLinks.length > 0;
    const mesOk = spine.manufacturing.status === 'ok';
    const ready = genealogyOk && (chainOk || spine.spineComplete);

    return {
      ready,
      td004: ready ? 'yellow-minimum' : 'partial',
      demoSerial: serial,
      tenantId,
      spineComplete: spine.spineComplete,
      genealogyLinks: forwardLinks.length,
      chainLinks: chainLinks.length,
      mesStatus: spine.manufacturing.status,
      financeStatus: spine.finance.status,
      chainSummary: chainData?.summary ?? null,
      checkedAt: new Date().toISOString(),
    };
  }

  /** W46 — ETO genealogy end-to-end view (PLM→PM→MES→INV→FIN) */
  async getE2eView(serialOrLot: string, tenantId = 'default') {
    const enc = encodeURIComponent(serialOrLot);

    const [spine, chain, plm, pm, mes] = await Promise.all([
      this.getSpine(serialOrLot, tenantId),
      this.fetchJson(`${this.gw}/api/inv/inventory/genealogy/chain/${enc}`, tenantId),
      this.fetchJson(`${this.gw}/api/plm/items`, tenantId),
      this.fetchJson(`${this.gw}/api/pm`, tenantId),
      this.fetchJson('http://127.0.0.1:4006/health/eto', tenantId),
    ]);

    const chainData = chain.data as {
      links?: Array<{ bomComponentId?: string; workOrderId?: string }>;
      summary?: Record<string, unknown>;
    } | null;
    const links = chainData?.links ?? [];
    const bomIds = new Set(links.map((l) => l.bomComponentId).filter(Boolean));
    const woIds = new Set(links.map((l) => l.workOrderId).filter(Boolean));

    const mesEto = mes.data as { workOrderCount?: number; ready?: boolean } | null;
    const mesCount = mesEto?.workOrderCount ?? woIds.size ?? spine.manufacturing.workOrders.length;

    const stages = [
      {
        id: 'plm',
        label: 'BOM / PLM',
        domain: 'PLM' as const,
        ok: plm.ok && bomIds.size > 0,
        status: bomIds.size > 0 ? 'ok' : plm.ok ? 'partial' : 'missing',
        count: bomIds.size,
        detail: `${bomIds.size} bomComponentId w łańcuchu`,
      },
      {
        id: 'pm',
        label: 'Projekt / PM',
        domain: 'PM' as const,
        ok: pm.ok,
        status: pm.ok ? 'ok' : 'missing',
        count: Array.isArray(pm.data) ? pm.data.length : 0,
        detail: pm.ok ? 'Projekty dostępne' : 'PM niedostępny',
      },
      {
        id: 'mes',
        label: 'Produkcja MES',
        domain: 'MES' as const,
        ok: mes.ok && mesCount >= 0 && spine.manufacturing.status === 'ok',
        status: mes.ok && spine.manufacturing.status === 'ok' ? 'ok' : mes.ok ? 'partial' : 'missing',
        count: mesCount,
        detail: `${mesCount} work order(s)`,
      },
      {
        id: 'inv',
        label: 'Genealogia INV',
        domain: 'INV' as const,
        ok: spine.genealogy.count > 0,
        status: spine.genealogy.count > 0 ? 'ok' : 'missing',
        count: spine.genealogy.count,
        detail: `${links.length} linków chain`,
      },
      {
        id: 'fin',
        label: 'Koszt / Finance',
        domain: 'FIN' as const,
        ok: spine.finance.status === 'ok',
        status: spine.finance.status === 'ok' ? 'ok' : 'partial',
        count: spine.finance.wipAccounts.length,
        detail: `${spine.finance.journalHints.length} wpisów journal`,
      },
    ];

    const passed = stages.filter((s) => s.ok).length;
    const ready = passed >= 4 && spine.spineComplete;

    return {
      serialOrLot,
      tenantId,
      ready,
      td004: passed >= 5 ? 'yellow-minimum' : passed >= 3 ? 'partial' : 'down',
      stagesPassed: passed,
      stagesTotal: stages.length,
      stages,
      spineComplete: spine.spineComplete,
      chainSummary: chainData?.summary ?? null,
      genealogyLinks: spine.genealogy.count,
      checkedAt: new Date().toISOString(),
    };
  }
}
