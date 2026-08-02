import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EtoNatsPublisherService } from './eto-nats-publisher.service';
import { EtoWorkflowService } from './eto-workflow.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class EtoOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(EtoOrchestratorService.name);
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
    if (!correlationId?.trim()) {
      throw new Error('correlationId is required');
    }
    if (!projectId?.trim()) {
      throw new Error('projectId is required');
    }
    const stepList = steps?.length ? [...steps] : this.workflow.getStepIds();
    let jobs = 0;
    const timeouts: { step: string; timeoutMs: number; scheduledAt: string }[] = [];
    for (let i = 0; i < stepList.length; i++) {
      const stepId = stepList[i];
      const timeoutMs = this.workflow.getStepTimeoutMs(stepId);
      await this.prisma.etoOrchestrationJob.create({
        data: {
          correlationId,
          projectId,
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

  /**
   * Publish in-scope pilot compensation (finance.wip.cost.reversed).
   * Failures are logged — never swallowed with empty catch (G-lite).
   * Enterprise Q2: also publish step-specific matrix compensations (revenue / reservation / commitment).
   */
  private async publishWipCompensation(
    job: { correlationId: string; projectId: string; tenantId: string; step: string },
    reason: string,
  ): Promise<boolean> {
    try {
      const ok = await this.nats.publishCompensation(
        'finance.wip.cost.reversed',
        job.correlationId,
        job.projectId,
        job.step,
        job.tenantId || 'default',
      );
      if (!ok) {
        this.logger.error(
          `Compensation publish failed (${reason}) correlationId=${job.correlationId} projectId=${job.projectId} step=${job.step}`,
        );
        return false;
      }
      this.logger.warn(
        `Compensation published (${reason}) correlationId=${job.correlationId} projectId=${job.projectId} step=${job.step}`,
      );
      // Full financial matrix (KD-Q2-4) — best-effort additional subjects
      await this.publishMatrixCompensations(job, reason);
      return true;
    } catch (e) {
      this.logger.error(
        `Compensation publish threw (${reason}) correlationId=${job.correlationId}: ${(e as Error).message}`,
        e instanceof Error ? e.stack : undefined,
      );
      return false;
    }
  }

  /** Publish revenue reverse / reservation restore / commitment release based on failed step. */
  private async publishMatrixCompensations(
    job: { correlationId: string; projectId: string; tenantId: string; step: string },
    reason: string,
  ): Promise<void> {
    const step = (job.step || '').toLowerCase();
    const extras: string[] = [];
    if (
      step.includes('ksef') ||
      step.includes('revenue') ||
      step.includes('milestone') ||
      step.includes('invoice') ||
      step.includes('tax.')
    ) {
      extras.push('finance.revenue.reversed.v1');
    }
    if (
      step.includes('reservation') ||
      step.includes('inventory') ||
      step.includes('stock.reserved')
    ) {
      extras.push('inventory.reservation.restored');
    }
    if (
      step.includes('purchaseorder') ||
      step.includes('proc.') ||
      step.includes('commitment')
    ) {
      extras.push('finance.commitment.released.v1');
    }
    for (const subject of extras) {
      try {
        const ok = await this.nats.publishCompensation(
          subject,
          job.correlationId,
          job.projectId,
          job.step,
          job.tenantId || 'default',
        );
        if (!ok) {
          this.logger.error(
            `Matrix compensation publish failed (${reason}) subject=${subject} correlationId=${job.correlationId}`,
          );
        } else {
          this.logger.warn(
            `Matrix compensation published (${reason}) subject=${subject} correlationId=${job.correlationId}`,
          );
        }
      } catch (e) {
        this.logger.error(
          `Matrix compensation threw (${reason}) subject=${subject}: ${(e as Error).message}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
    }
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
        await this.publishWipCompensation(
          {
            correlationId: job.correlationId,
            projectId: job.projectId,
            tenantId: job.tenantId,
            step: job.step,
          },
          'step-timeout',
        );
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
          projectId: job.projectId,
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
            await this.publishWipCompensation(
              {
                correlationId: job.correlationId,
                projectId: job.projectId,
                tenantId: job.tenantId,
                step: job.step,
              },
              'max-attempts-failed',
            );
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Orchestrator tick error: ${(e as Error).message}`);
    }
  }
}
