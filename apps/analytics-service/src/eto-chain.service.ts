import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import {
  loadSagasFromDb,
  loadSagasFromJson,
  listCompensations,
  persistSagas,
  recordCompensation,
  resolveStore,
} from './eto-saga-store';
import { PrismaService } from './prisma.service';
import { EtoNatsPublisherService } from './eto-nats-publisher.service';

export const ETO_SAGA_STEPS = [
  'plm.bom.released.v2',
  'pm.material.requested.v1',
  'inventory.reservation.created.v1',
  'mes.workorder.planned',
  'mes.production.recorded.v1',
  'inventory.reservation.released.v1',
  'finance.wip.cost.recorded',
] as const;

export type EtoSagaStepId = (typeof ETO_SAGA_STEPS)[number];

export type EtoSagaStatus = 'ACTIVE' | 'COMPENSATING' | 'COMPENSATED' | 'COMPLETED';

export interface EtoSagaState {
  correlationId: string;
  projectId: string;
  status?: EtoSagaStatus;
  completedSteps: string[];
  lastEventAt: string;
  percentComplete: number;
}

const COMPENSATION_ACTIONS: Partial<Record<EtoSagaStepId, string>> = {
  'finance.wip.cost.recorded': 'finance.wip.cost.reversed',
  'inventory.reservation.released.v1': 'inventory.reservation.restored',
  'mes.production.recorded.v1': 'mes.production.reversed',
  'mes.workorder.planned': 'mes.workorder.cancelled',
  'inventory.reservation.created.v1': 'inventory.reservation.released.v1',
  'pm.material.requested.v1': 'pm.material.request.cancelled',
  'plm.bom.released.v2': 'plm.bom.unreleased',
};

@Injectable()
export class EtoChainService implements OnModuleInit {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
  private readonly sagas = new Map<string, EtoSagaState>();
  private defaultCorrelation = 'eto-demo-chain';
  private storeMode: 'postgres' | 'json' = 'json';

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly nats?: EtoNatsPublisherService,
  ) {}

  async onModuleInit() {
    this.storeMode = await resolveStore(this.prisma ?? null);
    const loaded =
      this.storeMode === 'postgres' && this.prisma
        ? await loadSagasFromDb(this.prisma)
        : loadSagasFromJson();
    if (loaded.size === 0) {
      const json = loadSagasFromJson();
      for (const [k, v] of json) loaded.set(k, v);
    }
    for (const [k, v] of loaded) this.sagas.set(k, v);
    if (loaded.size > 0) void this.persist();
  }

  private persist() {
    void persistSagas(this.prisma ?? null, this.sagas).then((mode) => {
      this.storeMode = mode;
    });
  }

  private matchStep(subject: string): EtoSagaStepId | null {
    if (ETO_SAGA_STEPS.includes(subject as EtoSagaStepId)) return subject as EtoSagaStepId;
    if (subject.includes('bom.released')) return 'plm.bom.released.v2';
    if (subject.includes('material.requested')) return 'pm.material.requested.v1';
    if (subject.includes('reservation.created')) return 'inventory.reservation.created.v1';
    if (subject.includes('workorder.planned')) return 'mes.workorder.planned';
    if (subject.includes('production.recorded')) return 'mes.production.recorded.v1';
    if (subject.includes('reservation.released')) return 'inventory.reservation.released.v1';
    if (subject.includes('wip.cost')) return 'finance.wip.cost.recorded';
    return null;
  }

  ingestEvent(subject: string, payload?: unknown) {
    const p = payload as Record<string, unknown> | undefined;
    const correlationId = String(p?.correlationId || p?.projectId || this.defaultCorrelation);
    let saga = this.sagas.get(correlationId) ?? {
      correlationId,
      projectId: String(p?.projectId || 'proj-eto-demo'),
      status: 'ACTIVE' as EtoSagaStatus,
      completedSteps: [] as string[],
      lastEventAt: new Date().toISOString(),
      percentComplete: 0,
    };

    const matched = this.matchStep(subject);
    const isCompensate = p?.compensate === true || p?.compensate === 'true';
    if (matched && !isCompensate && !saga.completedSteps.includes(matched)) {
      saga.completedSteps.push(matched);
    }
    saga.lastEventAt = new Date().toISOString();
    saga.percentComplete = Math.round((saga.completedSteps.length / ETO_SAGA_STEPS.length) * 100);
    this.sagas.set(correlationId, saga);

    if (correlationId !== this.defaultCorrelation) {
      const def = this.sagas.get(this.defaultCorrelation) ?? {
        correlationId: this.defaultCorrelation,
        projectId: saga.projectId,
        status: 'ACTIVE' as EtoSagaStatus,
        completedSteps: [] as string[],
        lastEventAt: saga.lastEventAt,
        percentComplete: 0,
      };
      if (matched && !isCompensate && !def.completedSteps.includes(matched)) {
        def.completedSteps.push(matched);
        def.percentComplete = Math.round((def.completedSteps.length / ETO_SAGA_STEPS.length) * 100);
        def.lastEventAt = saga.lastEventAt;
        this.sagas.set(this.defaultCorrelation, def);
      }
    }
    this.persist();
  }

  listHistory(take = 20) {
    return {
      sagas: [...this.sagas.values()]
        .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt))
        .slice(0, take),
      store: this.storeMode,
      total: this.sagas.size,
    };
  }

  async listCompensationLog(correlationId?: string, take = 20) {
    const rows = await listCompensations(this.prisma ?? null, correlationId, take);
    return {
      compensations: rows.map((r) => ({
        id: r.id,
        correlationId: r.correlationId,
        step: r.step,
        action: r.action,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      store: this.storeMode,
    };
  }

  async compensate(correlationId: string) {
    const saga = this.sagas.get(correlationId);
    if (!saga) return { ok: false, error: 'saga not found', correlationId };

    saga.status = 'COMPENSATING';
    const applied: Array<{ step: string; action: string }> = [];

    const natsPublished: string[] = [];
    for (const step of [...saga.completedSteps].reverse()) {
      const action = COMPENSATION_ACTIONS[step as EtoSagaStepId] ?? `compensate.${step}`;
      if (this.nats) {
        const ok = await this.nats.publishCompensation(action, correlationId, saga.projectId, step);
        if (ok) natsPublished.push(action);
      }
      this.ingestEvent(action, { correlationId, projectId: saga.projectId, compensate: true });
      await recordCompensation(this.prisma ?? null, correlationId, step, action);
      applied.push({ step, action });
    }

    saga.completedSteps = [];
    saga.percentComplete = 0;
    saga.status = 'COMPENSATED';
    saga.lastEventAt = new Date().toISOString();
    this.sagas.set(correlationId, saga);
    this.persist();

    return {
      ok: true,
      correlationId,
      status: saga.status,
      applied,
      natsPublished,
      saga: this.getStatus(correlationId),
    };
  }

  getStatus(correlationId?: string) {
    const id = correlationId || this.defaultCorrelation;
    const saga = this.sagas.get(id);
    return {
      correlationId: id,
      store: this.storeMode,
      steps: ETO_SAGA_STEPS.map((s) => ({
        id: s,
        done: saga?.completedSteps.includes(s) ?? false,
      })),
      saga: saga ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  async triggerDemo(tenantId = 'default') {
    const correlationId = `eto-${Date.now()}`;
    const projectId = 'proj-eto-demo';
    const bomPayload = {
      bomVersionId: 'bom-eto-demo',
      itemId: 'machine-eto-001',
      revision: 'A',
      projectId,
      tenantId,
      correlationId,
      components: [
        { bomComponentId: 'bc-motor', childItemId: 'item-motor-001', quantity: 1 },
        { bomComponentId: 'bc-frame', childItemId: 'item-frame-002', quantity: 2 },
      ],
    };

    const results: Record<string, string> = {};

    try {
      const invRes = await fetch(`${this.gw}/api/inv/inventory/simulate/plm-bom-released`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ ...bomPayload, workOrderId: 'wo-eto-demo-001' }),
        signal: AbortSignal.timeout(12000),
      });
      results.invReservations = invRes.ok ? 'ok' : `fail ${invRes.status}`;
      this.ingestEvent('plm.bom.released.v2', bomPayload);
      this.ingestEvent('pm.material.requested.v1', { projectId, correlationId });
      this.ingestEvent('inventory.reservation.created.v1', { projectId, correlationId });
      this.ingestEvent('mes.workorder.planned', { projectId, correlationId, workOrderId: 'wo-eto-demo-001' });
    } catch (e) {
      results.invReservations = (e as Error).message;
    }

    try {
      const mesRes = await fetch(`${this.gw}/api/mes/work-orders`, {
        headers: { 'X-Tenant-Id': tenantId },
        signal: AbortSignal.timeout(8000),
      });
      const wos = mesRes.ok ? await mesRes.json() : [];
      const woId = wos[0]?.id || 'wo-eto-demo-001';
      const finRes = await fetch(`${this.gw}/api/mes/work-orders/${woId}/finish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ quantityGood: 1, laborHours: 8 }),
        signal: AbortSignal.timeout(12000),
      });
      results.mesProduction = finRes.ok ? 'ok' : `fail ${finRes.status}`;
      if (finRes.ok) {
        this.ingestEvent('mes.production.recorded.v1', { workOrderId: woId, projectId, correlationId });
        this.ingestEvent('inventory.reservation.released.v1', { workOrderId: woId, correlationId });
        this.ingestEvent('finance.wip.cost.recorded', { projectId, correlationId });
      }
    } catch (e) {
      results.mesProduction = (e as Error).message;
    }

    try {
      await fetch(`${this.gw}/api/analytics/traceability/seed-demo`, {
        method: 'POST',
        headers: { 'X-Tenant-Id': tenantId },
        signal: AbortSignal.timeout(10000),
      });
      results.traceability = 'seeded';
    } catch (e) {
      results.traceability = (e as Error).message;
    }

    this.sagas.set(correlationId, {
      correlationId,
      projectId,
      completedSteps: this.sagas.get(correlationId)?.completedSteps ?? [],
      lastEventAt: new Date().toISOString(),
      percentComplete: this.sagas.get(correlationId)?.percentComplete ?? 0,
    });

    this.persist();
    return {
      correlationId,
      projectId,
      tenantId,
      results,
      status: this.getStatus(correlationId),
    };
  }

  async plmExplosion(bomVersionId: string, projectId: string, tenantId = 'default') {
    const correlationId = `plm-${bomVersionId}-${Date.now()}`;
    const results: Record<string, string> = {};

    try {
      const rel = await fetch(`${this.gw}/api/plm/bom-versions/${bomVersionId}/release`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ releasedBy: 'eto-explosion' }),
        signal: AbortSignal.timeout(15000),
      });
      results.plmRelease = rel.ok ? 'released' : `fail ${rel.status}`;
      if (rel.ok) {
        this.ingestEvent('plm.bom.released.v2', { bomVersionId, projectId, correlationId, tenantId });
      }
    } catch (e) {
      results.plmRelease = (e as Error).message;
    }

    const chain = await this.triggerDemo(tenantId);
    results.chain = chain.correlationId;

    return {
      bomVersionId,
      projectId,
      tenantId,
      correlationId,
      results,
      status: this.getStatus(correlationId),
      chainStatus: chain.status,
    };
  }
}
