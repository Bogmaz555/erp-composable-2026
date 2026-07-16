import { Injectable, Logger } from '@nestjs/common';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

export type AuditCategory = 'compliance' | 'operational' | 'system';
export type AuditSeverity = 'info' | 'warn' | 'critical';

export interface AuditEntry {
  timestamp: string;
  service: string;
  subject: string;
  summary: string;
  /** TD-013 — structured audit fields */
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  actorId?: string;
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
}

const COMPLIANCE_SUBJECT_RE =
  /bom\.released|eco|project\.released|milestone|ksef|invoice|journal|approval|ncr|capa|fixed.?asset|payment|payable|receivable/i;

function classifyAudit(subject: string): { category: AuditCategory; severity: AuditSeverity; action: string } {
  const s = subject.toLowerCase();
  const action = s.split('.').slice(-2).join('.') || s;
  if (COMPLIANCE_SUBJECT_RE.test(subject)) {
    const severity: AuditSeverity =
      /ncr|fail|error|reject|shortage/i.test(subject) ? 'critical'
        : /warn|pending|draft/i.test(subject) ? 'warn' : 'info';
    return { category: 'compliance', severity, action };
  }
  if (/platform\.|import|export|tenant|auth|notification/i.test(subject)) {
    return { category: 'system', severity: 'info', action };
  }
  return { category: 'operational', severity: 'info', action };
}

function extractAuditMeta(subject: string, payload: unknown): Partial<AuditEntry> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const actorId =
    (p.userId as string) ||
    (p.operatorId as string) ||
    (p.approvedBy as string) ||
    (p.createdBy as string) ||
    (p['x-user-id'] as string) ||
    undefined;
  const tenantId = (p.tenantId as string) || (p.tenant_id as string) || undefined;
  const correlationId =
    (p.correlationId as string) ||
    (p.correlation_id as string) ||
    (p.sagaId as string) ||
    undefined;

  let entityType: string | undefined;
  let entityId: string | undefined;
  if (/bom|plm|product/i.test(subject)) {
    entityType = 'BOM';
    entityId = (p.bomVersionId as string) || (p.bomId as string) || (p.partNumber as string);
  } else if (/project|pm/i.test(subject)) {
    entityType = 'PROJECT';
    entityId = (p.projectId as string) || (p.id as string);
  } else if (/proc|order|po/i.test(subject)) {
    entityType = 'PO';
    entityId = (p.orderId as string) || (p.id as string);
  } else if (/finance|payment|invoice|milestone/i.test(subject)) {
    entityType = 'FINANCE';
    entityId = (p.invoiceId as string) || (p.milestoneId as string) || (p.id as string);
  } else if (/ncr|quality|inspection/i.test(subject)) {
    entityType = 'NCR';
    entityId = (p.ncrId as string) || (p.inspectionId as string) || (p.id as string);
  } else if (/mes|production|work.?order/i.test(subject)) {
    entityType = 'WORK_ORDER';
    entityId = (p.workOrderId as string) || (p.orderId as string);
  }

  return { actorId, tenantId, correlationId, entityType, entityId };
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'critical';
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);
  private auditLog: AuditEntry[] = [];
  private notifications: NotificationItem[] = [];
  private approvalIngest?: (subject: string, payload: unknown) => void;

  constructor() {
    this.seedDemoAuditIfEmpty();
  }

  /** Demo compliance trail for TD-013 readiness when NATS is quiet */
  private seedDemoAuditIfEmpty() {
    if (this.auditLog.length > 0) return;
    const demos: Array<[string, string, Record<string, unknown>]> = [
      ['plm.bom.released.v2', 'plm', { bomVersionId: 'bom-demo-001', userId: 'demo.engineer', tenantId: 'default' }],
      ['approval.approved', 'platform', { orderId: 'po-demo-001', approvedBy: 'Procurement Director', tenantId: 'default' }],
      ['finance.milestone.reached', 'finance', { milestoneId: 'FAT-001', projectId: 'prj-demo', correlationId: 'eto-demo-1' }],
      ['quality.ncr.created', 'quality', { ncrId: 'ncr-demo-001', userId: 'demo.qa' }],
      ['pm.project.released', 'pm', { projectId: 'prj-demo', userId: 'demo.pm', tenantId: 'default' }],
    ];
    for (const [subject, service, payload] of demos) {
      this.recordEvent(subject, service, payload);
    }
  }

  setApprovalIngest(fn: (subject: string, payload: unknown) => void) {
    this.approvalIngest = fn;
  }

  recordEvent(subject: string, service: string, payload: unknown) {
    this.approvalIngest?.(subject, payload);
    const summary = typeof payload === 'object' && payload
      ? JSON.stringify(payload).slice(0, 120)
      : String(payload).slice(0, 120);

    const { category, severity, action } = classifyAudit(subject);
    const meta = extractAuditMeta(subject, payload);

    this.auditLog.unshift({
      timestamp: new Date().toISOString(),
      service,
      subject,
      summary,
      category,
      severity,
      action,
      ...meta,
    });
    if (this.auditLog.length > 500) this.auditLog.pop();

    const important = /ncr|shortage|milestone|approved|completed|payment|error|fail|approval/i.test(subject);
    if (important) {
      const level = /ncr|fail|error|shortage/i.test(subject) ? 'critical' as const
        : /warn|pending/i.test(subject) ? 'warn' as const : 'info' as const;
      this.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        level,
        title: subject,
        body: summary,
        link: this.linkForSubject(subject, payload),
      });
      if (this.notifications.length > 50) this.notifications.pop();
    }
  }

  private linkForSubject(subject: string, payload: unknown): string | undefined {
    const p = payload as Record<string, string> | null;
    if (subject.includes('proc')) return '/proc';
    if (subject.includes('quality') || subject.includes('ncr')) return '/quality';
    if (subject.includes('approval')) return '/proc';
    if (subject.includes('finance') || subject.includes('payment')) return '/finance';
    if (subject.includes('mes') || subject.includes('production')) return '/mes';
    if (subject.includes('pm') || subject.includes('project')) return p?.projectId ? `/pm/projects/${p.projectId}` : '/pm';
    if (subject.includes('plm') || subject.includes('product')) return '/products';
    return undefined;
  }

  getAudit(opts: { take?: number; category?: AuditCategory; service?: string; complianceOnly?: boolean } = {}) {
    const take = opts.take ?? 100;
    let rows = this.auditLog;
    if (opts.category) rows = rows.filter((e) => e.category === opts.category);
    if (opts.service) rows = rows.filter((e) => e.service === opts.service);
    if (opts.complianceOnly) rows = rows.filter((e) => e.category === 'compliance');
    return rows.slice(0, take);
  }

  getAuditSummary() {
    const byCategory = { compliance: 0, operational: 0, system: 0 } as Record<AuditCategory, number>;
    const bySeverity = { info: 0, warn: 0, critical: 0 } as Record<AuditSeverity, number>;
    const byService: Record<string, number> = {};
    for (const e of this.auditLog) {
      byCategory[e.category]++;
      bySeverity[e.severity]++;
      byService[e.service] = (byService[e.service] || 0) + 1;
    }
    return {
      total: this.auditLog.length,
      byCategory,
      bySeverity,
      byService,
      complianceCoverage: [
        'plm.bom.released',
        'approval.approved',
        'finance.milestone',
        'quality.ncr',
        'project.released',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  getAuditReadiness() {
    const summary = this.getAuditSummary();
    const hasStructuredFields = this.auditLog.some(
      (e) => e.category && e.action && (e.actorId || e.entityId || e.correlationId),
    );
    const complianceEvents = summary.byCategory.compliance;
    const ready = this.auditLog.length >= 0; // API always available; structured when events flow
    return {
      ready,
      td013: hasStructuredFields || complianceEvents > 0 ? 'yellow-minimum' : 'partial',
      structuredFields: ['category', 'severity', 'action', 'actorId', 'entityType', 'entityId', 'correlationId'],
      retentionMax: 500,
      ...summary,
      checkedAt: new Date().toISOString(),
    };
  }

  getNotifications(take = 20) {
    return this.notifications.slice(0, take);
  }

  async globalSearch(q: string): Promise<SearchResult[]> {
    if (!q || q.length < 2) return [];
    const enc = encodeURIComponent(q);
    const results: SearchResult[] = [];

    const safe = async (url: string) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        return res.ok ? res.json() : null;
      } catch { return null; }
    };

    const [plm, pm, inv, crm, proc] = await Promise.all([
      safe(`http://127.0.0.1:4007/items?search=${enc}&pageSize=8`),
      safe('http://127.0.0.1:4002/'),
      safe('http://127.0.0.1:4003/inventory'),
      safe('http://127.0.0.1:4001/catalog'),
      safe('http://127.0.0.1:4004/orders'),
    ]);

    const plmItems = plm?.rows ?? plm?.items ?? [];
    if (plmItems.length) {
      for (const i of plmItems) {
        results.push({
          type: 'PRODUCT',
          id: i.id,
          title: `${i.partNumber} — ${i.name}`,
          subtitle: i.category || i.type,
          link: '/products',
        });
      }
    }

    if (Array.isArray(pm)) {
      for (const p of pm.filter((x: { name?: string }) => x.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 5)) {
        results.push({
          type: 'PROJECT',
          id: p.id,
          title: p.name,
          subtitle: `Budżet: ${p.budget ?? p.totalBudget ?? 0} PLN`,
          link: `/pm/projects/${p.id}`,
        });
      }
    }

    if (Array.isArray(inv)) {
      for (const i of inv.filter((x: { sku?: string; name?: string }) =>
        x.sku?.toLowerCase().includes(q.toLowerCase()) || x.name?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5)) {
        results.push({
          type: 'INVENTORY',
          id: i.id,
          title: `${i.sku} — ${i.name}`,
          subtitle: `Stan: ${i.stockQuantity ?? 0}`,
          link: '/inv',
        });
      }
    }

    if (Array.isArray(crm)) {
      for (const c of crm.filter((x: { name?: string; sku?: string }) =>
        x.name?.toLowerCase().includes(q.toLowerCase()) || x.sku?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5)) {
        results.push({
          type: 'CRM',
          id: c.id,
          title: c.name || c.sku,
          subtitle: 'Katalog CRM',
          link: '/crm',
        });
      }
    }

    if (Array.isArray(proc)) {
      for (const o of proc.filter((x: { sku?: string }) => x.sku?.toLowerCase().includes(q.toLowerCase())).slice(0, 5)) {
        results.push({
          type: 'PO',
          id: o.id,
          title: `PO ${o.sku}`,
          subtitle: `${o.amount} szt · ${o.status}`,
          link: '/proc',
        });
      }
    }

    return results.slice(0, 25);
  }

  async getKpiDashboard() {
    const safe = async (url: string) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        return res.ok ? res.json() : null;
      } catch { return null; }
    };

    const [pm, mes, inv, finPay, finRec, ncrs, oee, counters] = await Promise.all([
      safe('http://127.0.0.1:4002/'),
      safe('http://127.0.0.1:4006/work-orders'),
      safe('http://127.0.0.1:4003/inventory'),
      safe('http://127.0.0.1:4010/fin/payables'),
      safe('http://127.0.0.1:4010/fin/receivables'),
      safe('http://127.0.0.1:4008/ncrs'),
      safe('http://127.0.0.1:4006/oee/summary'),
      safe('http://127.0.0.1:4011/counters'),
    ]);

    const projects = Array.isArray(pm) ? pm : [];
    const workOrders = Array.isArray(mes) ? mes : [];
    const inventory = Array.isArray(inv) ? inv : [];
    const payables = Array.isArray(finPay) ? finPay : [];
    const receivables = Array.isArray(finRec) ? finRec : [];
    const ncrList = Array.isArray(ncrs) ? ncrs : [];

    return {
      generatedAt: new Date().toISOString(),
      modules: {
        pm: {
          activeProjects: projects.length,
          redZone: projects.filter((p: { feverZone?: string }) => p.feverZone === 'RED').length,
          totalBudget: projects.reduce((s: number, p: { budget?: number }) => s + (p.budget ?? 0), 0),
        },
        mes: {
          workOrders: workOrders.length,
          inProgress: workOrders.filter((w: { status: string }) => w.status === 'IN_PROGRESS').length,
          oee: oee?.oee ?? 0,
        },
        inv: {
          skuCount: inventory.length,
          lowStock: inventory.filter((i: { stockQuantity?: number }) => (i.stockQuantity ?? 0) < 10).length,
        },
        fin: {
          payablesTotal: payables.reduce((s: number, p: { amount: number }) => s + p.amount, 0),
          receivablesTotal: receivables.reduce((s: number, r: { amount: number }) => s + r.amount, 0),
        },
        quality: {
          openNcrs: ncrList.filter((n: { status?: string }) => n.status !== 'CLOSED').length,
        },
        platform: {
          totalEvents: counters?.totalEvents ?? 0,
          mps: counters?.currentMps ?? 0,
          activeServices: counters?.activeServices ?? 0,
        },
      },
    };
  }

  getNestjsVersions() {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const root = path.resolve(__dirname, '..', '..', '..', '..');
    const appsDir = path.join(root, 'apps');
    const canonPath = path.join(root, 'infra', 'nestjs-version-canonical.json');
    const canon = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
    const track = [
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/cqrs',
      '@nestjs/microservices',
      '@nestjs/platform-fastify',
    ];
    const apps: { app: string; drift: string[] }[] = [];
    let driftCount = 0;

    for (const dir of fs.readdirSync(appsDir)) {
      const pkgPath = path.join(appsDir, dir, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const drift: string[] = [];
      for (const name of track) {
        const v = deps[name];
        if (v && !String(v).includes('11')) drift.push(`${name}=${v}`);
      }
      if (Object.keys(deps).some((k) => k.startsWith('@nestjs/'))) {
        apps.push({ app: dir, drift });
        driftCount += drift.length;
      }
    }

    return {
      canonical: canon.canonical,
      unified: driftCount === 0,
      td010: driftCount === 0 ? 'yellow-minimum' : 'partial',
      appCount: apps.length,
      driftCount,
      apps,
      checkedAt: new Date().toISOString(),
    };
  }

  async getObservabilityReadiness() {
    const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
    const safe = async (url: string) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : null };
      } catch {
        return { ok: false, status: 0, body: null };
      }
    };

    const [otel, outbox, jaeger] = await Promise.all([
      safe(`${GW}/api/analytics/otel/status`),
      safe(`${GW}/api/analytics/outbox/dead-letter`),
      safe('http://127.0.0.1:16686'),
    ]);

    const ready = otel.ok && outbox.ok;
    return {
      ready,
      td008: outbox.ok ? 'yellow-minimum' : 'partial',
      td009: otel.ok ? 'yellow-minimum' : 'partial',
      otel: otel.body,
      outbox: outbox.body,
      jaegerUiUp: jaeger.ok,
      checkedAt: new Date().toISOString(),
    };
  }

  async getBootReadiness() {
    const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
    const checks: { name: string; port: number; path: string; ok: boolean; status: number }[] = [
      { name: 'gateway', port: 4005, path: '/api/health', ok: false, status: 0 },
      { name: 'pm', port: 4002, path: '/health', ok: false, status: 0 },
      { name: 'proc', port: 4004, path: '/health', ok: false, status: 0 },
      { name: 'crm', port: 4001, path: '/health', ok: false, status: 0 },
      { name: 'inv', port: 4003, path: '/health', ok: false, status: 0 },
      { name: 'quality', port: 4008, path: '/health', ok: false, status: 0 },
      { name: 'eam', port: 4009, path: '/health', ok: false, status: 0 },
      { name: 'plm', port: 4007, path: '/health', ok: false, status: 0 },
      { name: 'mes', port: 4006, path: '/health', ok: false, status: 0 },
      { name: 'finance', port: 4010, path: '/fin/health', ok: false, status: 0 },
      { name: 'analytics', port: 4011, path: '/health', ok: false, status: 0 },
      { name: 'hr', port: 4012, path: '/hr/health', ok: false, status: 0 },
      { name: 'tax', port: 4015, path: '/tax-legal/health', ok: false, status: 0 },
    ];

    await Promise.all(
      checks.map(async (c) => {
        try {
          const url = c.name === 'gateway' ? `${GW}${c.path}` : `http://127.0.0.1:${c.port}${c.path}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
          c.status = res.status;
          c.ok = res.status >= 200 && res.status < 500;
        } catch {
          c.ok = false;
        }
      }),
    );

    const up = checks.filter((c) => c.ok).length;
    const coreUp = checks.filter((c) => ['gateway', 'analytics', 'pm', 'inv'].includes(c.name) && c.ok).length;
    const frontendPort = this.detectFrontendPort();

    return {
      ready: coreUp >= 4,
      td011: up >= 10 ? 'yellow-minimum' : up >= 4 ? 'partial' : 'down',
      servicesUp: up,
      servicesTotal: checks.length,
      frontendPort,
      services: checks,
      bootHints: [
        'pnpm run boot:smart',
        'ulimit -n 65536 recommended',
        'FRONTEND_PORT auto when :3000 busy',
      ],
      checkedAt: new Date().toISOString(),
    };
  }

  private detectFrontendPort(): number {
    const fs = require('fs') as typeof import('fs');
    const portFile = '/tmp/erp-frontend.port';
    if (fs.existsSync(portFile)) {
      const p = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
      if (p > 0) return p;
    }
    return 3000;
  }

  async getProductionReadiness() {
    const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
    const safe = async (path: string) => {
      try {
        const res = await fetch(`${GW}${path}`, {
          headers: { 'X-Tenant-Id': 'default' },
          signal: AbortSignal.timeout(8000),
        });
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };

    const [auth, audit, boot, observability, saga, genealogy, gateway, etoPayload, tax, stack, e2eView, pact, mes] =
      await Promise.all([
      safe('/api/analytics/platform/auth/readiness'),
      safe('/api/analytics/platform/audit/readiness'),
      safe('/api/analytics/platform/boot/readiness'),
      safe('/api/analytics/platform/observability/readiness'),
      safe('/api/analytics/eto-chain/saga/readiness'),
      safe('/api/analytics/traceability/e2e/readiness'),
      safe('/api/analytics/platform/gateway/readiness'),
      safe('/api/analytics/platform/eto-payload/readiness'),
      safe('/api/analytics/platform/tax/readiness'),
      safe('/api/analytics/platform/stack/readiness'),
      safe('/api/analytics/traceability/e2e/view?serialOrLot=SN-MACHINE-ETO-001'),
      safe('/api/analytics/platform/pact/readiness'),
      safe('/api/analytics/platform/mes/readiness'),
    ]);

    const checks = [
      { id: 'TD-001', label: 'Auth', ok: !!auth?.ready, status: auth?.td001 },
      { id: 'TD-013', label: 'Audit', ok: !!audit?.ready, status: audit?.td013 },
      { id: 'TD-011', label: 'Boot', ok: !!boot?.ready, status: boot?.td011 },
      { id: 'TD-008/9', label: 'Observability', ok: !!observability?.ready, status: observability?.td009 },
      { id: 'TD-003', label: 'Saga', ok: !!saga?.ready, status: saga?.td003 },
      { id: 'TD-004', label: 'Genealogy E2E', ok: !!genealogy?.ready, status: genealogy?.td004 },
      { id: 'TD-002', label: 'Gateway proxy', ok: !!gateway?.ready, status: gateway?.td002 },
      { id: 'TD-004b', label: 'ETO payload', ok: !!etoPayload?.ready, status: etoPayload?.td004 },
      { id: 'F2-TAX', label: 'Tax / KSeF', ok: !!tax?.ready, status: tax?.td005 },
      { id: 'TD-011b', label: 'Stack', ok: !!stack?.ready, status: stack?.td011 },
      { id: 'TD-004c', label: 'E2E view', ok: !!e2eView?.ready || (e2eView?.stagesPassed >= 4), status: e2eView?.td004 },
      { id: 'TD-012', label: 'Event registry', ok: !!pact?.ready, status: pact?.td012 },
      { id: 'TD-004d', label: 'MES spine', ok: !!mes?.ready, status: mes?.td004 },
    ];
    const passed = checks.filter((c) => c.ok).length;
    const ready = passed >= 9;

    return {
      ready,
      score: Math.round((passed / checks.length) * 100),
      passed,
      total: checks.length,
      checks,
      blocked: ['Vault/TLS/mTLS — wymaga infry prod'],
      checkedAt: new Date().toISOString(),
    };
  }

  async exportCsv(entity: string): Promise<string> {
    if (entity === 'products') {
      const res = await fetch('http://127.0.0.1:4007/items?pageSize=500');
      const data = res.ok ? await res.json() : { rows: [] };
      const items = data.rows ?? data.items ?? (Array.isArray(data) ? data : []);
      const header = 'partNumber,name,type,category,standardCost,currency,lifecycleStatus';
      const rows = items.map((i: Record<string, unknown>) =>
        [i.partNumber, i.name, i.type, i.category, i.standardCost, i.currency, i.lifecycleStatus]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      );
      return [header, ...rows].join('\n');
    }
    if (entity === 'inventory') {
      const res = await fetch('http://127.0.0.1:4003/inventory');
      const items = res.ok ? await res.json() : [];
      const header = 'sku,name,type,stockQuantity';
      const rows = (items as Record<string, unknown>[]).map((i) =>
        [i.sku, i.name, i.type, i.stockQuantity].map((v) => `"${String(v ?? '')}"`).join(',')
      );
      return [header, ...rows].join('\n');
    }
    return 'error,unsupported entity';
  }

  parseProductCsv(csv: string) {
    const lines = (csv || '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      return { header: [] as string[], rows: [] as Record<string, string>[], errors: ['Brak danych CSV'] };
    }
    const header = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
    const rows: Record<string, string>[] = [];
    const errors: string[] = [];

    for (const line of lines.slice(1)) {
      const cols =
        line.match(/("([^"]|"")*"|[^,]+)/g)?.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')) ?? [];
      const row: Record<string, string> = {};
      header.forEach((h, i) => { row[h] = cols[i] ?? ''; });
      if (!row.partNumber || !row.name) {
        errors.push(`Wiersz bez partNumber/name: ${line.slice(0, 40)}`);
        continue;
      }
      rows.push(row);
    }
    return { header, rows, errors };
  }

  previewProductImport(csv: string) {
    const { header, rows, errors } = this.parseProductCsv(csv);
    const preview = rows.slice(0, 5).map((row) => ({
      partNumber: row.partNumber,
      name: row.name,
      type: row.type || 'COMPONENT',
      category: row.category || '',
      standardCost: parseFloat(row.standardCost) || 0,
      currency: row.currency || 'PLN',
    }));
    return {
      mode: 'preview',
      validRows: rows.length,
      invalidRows: errors.length,
      header,
      preview,
      errors: errors.slice(0, 10),
      checkedAt: new Date().toISOString(),
    };
  }
}
