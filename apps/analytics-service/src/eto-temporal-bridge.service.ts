import { Injectable } from '@nestjs/common';
import * as net from 'net';
import { EtoNatsPublisherService } from './eto-nats-publisher.service';
import { EtoWorkflowService } from './eto-workflow.service';

@Injectable()
export class EtoTemporalBridgeService {
  private bridgeCycles = 0;
  private lastPublishedAt: string | null = null;
  private temporalReachable = false;
  private lastCheckAt: string | null = null;

  constructor(
    private readonly nats: EtoNatsPublisherService,
    private readonly workflow: EtoWorkflowService,
  ) {}

  private tcpCheck(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      const done = (ok: boolean) => {
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(timeoutMs);
      socket.on('connect', () => done(true));
      socket.on('timeout', () => done(false));
      socket.on('error', () => done(false));
    });
  }

  async refreshTemporalHealth() {
    const host = process.env.TEMPORAL_HOST || '127.0.0.1';
    const port = parseInt(process.env.TEMPORAL_PORT || '7233', 10);
    this.temporalReachable = await this.tcpCheck(host, port);
    this.lastCheckAt = new Date().toISOString();
    return this.temporalReachable;
  }

  async getStatus() {
    if (!this.lastCheckAt) await this.refreshTemporalHealth();
    const def = this.workflow.getDefinition();
    return {
      mode: this.temporalReachable ? 'temporal-connected' : 'lite-bridge',
      temporalReachable: this.temporalReachable,
      temporalHost: process.env.TEMPORAL_HOST || '127.0.0.1',
      temporalPort: parseInt(process.env.TEMPORAL_PORT || '7233', 10),
      workflow: def.name,
      workflowVersion: def.version,
      stepCount: def.stepCount,
      bridgeCycles: this.bridgeCycles,
      lastPublishedAt: this.lastPublishedAt,
      lastCheckAt: this.lastCheckAt,
      taskQueue: def.taskQueue,
    };
  }

  /** Publikuje kroki workflow na NATS — most Temporal-lite → event bus */
  async bridgeRun(correlationId: string, tenantId = 'default', projectId = 'proj-temporal-bridge') {
    const steps = this.workflow.getStepIds();
    let published = 0;
    for (const step of steps) {
      const ok = await this.nats.publish(step, {
        correlationId,
        projectId,
        tenantId,
        source: 'temporal-bridge',
        bridgeCycle: this.bridgeCycles + 1,
      });
      if (ok) published++;
    }
    this.bridgeCycles++;
    this.lastPublishedAt = new Date().toISOString();
    await this.refreshTemporalHealth();
    return {
      correlationId,
      tenantId,
      projectId,
      stepsPublished: published,
      totalSteps: steps.length,
      mode: this.temporalReachable ? 'temporal-connected' : 'lite-bridge',
      bridgeCycles: this.bridgeCycles,
    };
  }
}
