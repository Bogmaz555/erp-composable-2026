import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface WorkflowStep {
  id: string;
  service: string;
  timeout: string;
  compensate: string;
}

export interface WorkflowDefinition {
  name: string;
  version: string;
  taskQueue: string;
  steps: WorkflowStep[];
  retryPolicy: { initialInterval: string; maxAttempts: number; backoffCoefficient: number };
}

@Injectable()
export class EtoWorkflowService implements OnModuleInit {
  private definition: WorkflowDefinition | null = null;
  private source = 'inline';

  onModuleInit() {
    this.definition = this.loadYaml();
  }

  private resolveYamlPath(): string | null {
    const candidates = [
      path.join(process.cwd(), 'infra/workflows/eto-machine-build-v1.yaml'),
      path.join(process.cwd(), '..', '..', 'infra/workflows/eto-machine-build-v1.yaml'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  private loadYaml(): WorkflowDefinition {
    const yamlPath = this.resolveYamlPath();
    if (!yamlPath) {
      this.source = 'inline';
      return this.inlineDefinition();
    }
    try {
      const raw = fs.readFileSync(yamlPath, 'utf8');
      this.source = yamlPath;
      return this.parseYaml(raw);
    } catch {
      this.source = 'inline-fallback';
      return this.inlineDefinition();
    }
  }

  private parseYaml(raw: string): WorkflowDefinition {
    const steps: WorkflowStep[] = [];
    let current: Partial<WorkflowStep> = {};
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (t.startsWith('- id:')) {
        if (current.id) steps.push(current as WorkflowStep);
        current = { id: t.replace('- id:', '').trim() };
      } else if (t.startsWith('service:')) current.service = t.split(':')[1].trim();
      else if (t.startsWith('timeout:')) current.timeout = t.split(':').slice(1).join(':').trim();
      else if (t.startsWith('compensate:')) current.compensate = t.split(':').slice(1).join(':').trim();
    }
    if (current.id) steps.push(current as WorkflowStep);

    return {
      name: 'EtoMachineBuild',
      version: 'v1',
      taskQueue: 'erp-eto-saga',
      steps,
      retryPolicy: { initialInterval: '2s', maxAttempts: 5, backoffCoefficient: 1.5 },
    };
  }

  private inlineDefinition(): WorkflowDefinition {
    return {
      name: 'EtoMachineBuild',
      version: 'v1',
      taskQueue: 'erp-eto-saga',
      steps: [
        { id: 'plm.bom.released.v2', service: 'plm', timeout: '30s', compensate: 'plm.bom.unreleased' },
        { id: 'pm.material.requested.v1', service: 'pm', timeout: '20s', compensate: 'pm.material.request.cancelled' },
        { id: 'inventory.reservation.created.v1', service: 'inv', timeout: '20s', compensate: 'inventory.reservation.released.v1' },
        { id: 'mes.workorder.planned', service: 'mes', timeout: '30s', compensate: 'mes.workorder.cancelled' },
        { id: 'mes.production.recorded.v1', service: 'mes', timeout: '60s', compensate: 'mes.production.reversed' },
        { id: 'inventory.reservation.released.v1', service: 'inv', timeout: '20s', compensate: 'inventory.reservation.restored' },
        { id: 'finance.wip.cost.recorded', service: 'finance', timeout: '30s', compensate: 'finance.wip.cost.reversed' },
      ],
      retryPolicy: { initialInterval: '2s', maxAttempts: 5, backoffCoefficient: 1.5 },
    };
  }

  getDefinition() {
    const def = this.definition ?? this.inlineDefinition();
    return {
      ...def,
      source: this.source,
      stepCount: def.steps.length,
      temporalReady: true,
    };
  }

  getStepIds(): string[] {
    return (this.definition ?? this.inlineDefinition()).steps.map((s) => s.id);
  }

  getCompensationFor(stepId: string): string | null {
    const step = (this.definition ?? this.inlineDefinition()).steps.find((s) => s.id === stepId);
    return step?.compensate ?? null;
  }

  parseTimeoutMs(timeout: string): number {
    const m = timeout?.trim().match(/^(\d+)(ms|s|m|h)$/i);
    if (!m) return 30_000;
    const n = parseInt(m[1], 10);
    switch (m[2].toLowerCase()) {
      case 'ms': return n;
      case 's': return n * 1000;
      case 'm': return n * 60_000;
      case 'h': return n * 3_600_000;
      default: return 30_000;
    }
  }

  getStepTimeoutMs(stepId: string): number {
    const step = (this.definition ?? this.inlineDefinition()).steps.find((s) => s.id === stepId);
    return this.parseTimeoutMs(step?.timeout ?? '30s');
  }

  getStepTimeouts() {
    return (this.definition ?? this.inlineDefinition()).steps.map((s) => ({
      step: s.id,
      service: s.service,
      timeout: s.timeout,
      timeoutMs: this.parseTimeoutMs(s.timeout),
    }));
  }

  getMaxStepTimeoutMs(): number {
    return Math.max(...this.getStepTimeouts().map((t) => t.timeoutMs), 30_000);
  }

  getTotalChainTimeoutMs(): number {
    return this.getStepTimeouts().reduce((sum, t) => sum + t.timeoutMs, 0);
  }
}
