import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EtoNatsPublisherService } from './eto-nats-publisher.service';
import { EtoWorkflowService } from './eto-workflow.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class EtoOrchestratorService implements OnModuleInit {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: EtoNatsPublisherService,
    private readonly workflow: EtoWorkflowService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 5000);
  }

  async enqueueChain(
    correlationId: string,
    projectId: string,
    tenantId = 'default',
    steps?: readonly string[],
  ) {
    const stepList = steps?.length ? [...steps] : this.workflow.getStepIds();
    let jobs = 0;
    const timeouts: { step: string; timeoutMs: number; scheduledAt: string }[] = [];
    for (let i = 0; i < stepList.length; i++) {
      const stepId = stepList[i];
      const timeoutMs = this.workflow.getStepTimeoutMs(stepId);
      await this.prisma.etoOrchestrationJob.create({
        data: {
          correlationId,
          tenantId,
          step: stepId,
          status: i === 0 ? 'PENDING' : 'BLOCKED',
          nextRunAt: new Date(),
        },
      });
      timeouts.push({ step: stepId, timeoutMs, scheduledAt: new Date().toISOString() });
      jobs++;
    }
    return {
      correlationId,
      projectId,
      tenantId,
      jobs,
      queued: stepList,
      workflow: this.workflow.getDefinition().name,
      workflowVersion: this.workflow.getDefinition().version,
      totalTimeoutMs: this.workflow.getTotalChainTimeoutMs(),
      stepTimeouts: timeouts,
    };
  }

  async getQueueStatus(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const [pending, done, failed] = await Promise.all([
      this.prisma.etoOrchestrationJob.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.etoOrchestrationJob.count({ where: { ...where, status: 'DONE' } }),
      this.prisma.etoOrchestrationJob.count({ where: { ...where, status: 'FAILED' } }),
    ]);
    return {
      tenantId: tenantId || 'all',
      pending,
      done,
      failed,
      total: pending + done + failed,
      maxStepTimeoutMs: this.workflow.getMaxStepTimeoutMs(),
      totalChainTimeoutMs: this.workflow.getTotalChainTimeoutMs(),
      stepTimeoutCount: this.workflow.getStepTimeouts().length,
    };
  }

  private async recoverStaleJobs() {
    const pending = await this.prisma.etoOrchestrationJob.findMany({
      where: { status: 'IN_PROGRESS' },
      take: 30,
      orderBy: { updatedAt: 'asc' },
    });
    const now = Date.now();
    for (const job of pending) {
      const limitMs = this.workflow.getStepTimeoutMs(job.step) * MAX_ATTEMPTS;
      if (now - job.updatedAt.getTime() > limitMs) {
        await this.prisma.etoOrchestrationJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', lastError: 'step timeout exceeded (YAML)' },
        });
        // TRIGGER COMPENSATION!
        await this.nats.publishCompensation('finance.wip.cost.reversed', job.correlationId, 'proj-eto-demo', job.step).catch(() => {});
      }
    }
  }

  private async tick() {
    try {
      await this.recoverStaleJobs();

      // Find chains that have a FAILED job. We should mark the whole chain as FAILED.
      // Skipping for now to keep it simple, they just stop progressing.

      // Find jobs to run
      const jobs = await this.prisma.etoOrchestrationJob.findMany({
        where: { status: 'PENDING', nextRunAt: { lte: new Date() } },
        take: 10,
        orderBy: { nextRunAt: 'asc' },
      });
      
      for (const job of jobs) {
        // Mark as IN_PROGRESS
        await this.prisma.etoOrchestrationJob.update({
          where: { id: job.id },
          data: { status: 'IN_PROGRESS', attempts: { increment: 1 } },
        });
        
        const ok = await this.nats.publish(job.step, {
          correlationId: job.correlationId,
          projectId: 'proj-eto-demo',
          tenantId: job.tenantId || 'default',
          orchestrationJobId: job.id,
        });
        
        if (!ok) {
          const attempts = job.attempts + 1;
          const backoff = Math.min(
            this.workflow.getStepTimeoutMs(job.step) / 2,
            attempts * 3000,
          );
          const newStatus = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
          await this.prisma.etoOrchestrationJob.update({
            where: { id: job.id },
            data: {
              attempts,
              lastError: 'nats publish failed',
              status: newStatus,
              nextRunAt: new Date(Date.now() + backoff),
            },
          });
          if (newStatus === 'FAILED') {
            await this.nats.publishCompensation('finance.wip.cost.reversed', job.correlationId, 'proj-eto-demo', job.step).catch(() => {});
          }
        }
      }
    } catch { /* db unavailable */ }
  }
}
