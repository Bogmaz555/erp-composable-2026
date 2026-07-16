import { Controller, Get, Post, Query, Headers, Body } from '@nestjs/common';
import { EtoChainService } from './eto-chain.service';
import { EtoOrchestratorService } from './eto-orchestrator.service';
import { EtoWorkflowService } from './eto-workflow.service';
import { EtoTemporalBridgeService } from './eto-temporal-bridge.service';

@Controller()
export class EtoChainController {
  constructor(
    private readonly eto: EtoChainService,
    private readonly orchestrator: EtoOrchestratorService,
    private readonly workflow: EtoWorkflowService,
    private readonly temporalBridge: EtoTemporalBridgeService,
  ) {}

  @Get('eto-chain/status')
  status(@Query('correlationId') correlationId?: string) {
    return this.eto.getStatus(correlationId);
  }

  @Get('eto-chain/history')
  history(@Query('take') take?: string) {
    return this.eto.listHistory(parseInt(take || '20', 10));
  }

  @Post('eto-chain/trigger-demo')
  trigger(@Headers('x-tenant-id') tenantHeader?: string) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    return this.eto.triggerDemo(tenantId);
  }

  @Post('eto-chain/plm-explosion')
  plmExplosion(
    @Body() body: { bomVersionId: string; projectId?: string },
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    return this.eto.plmExplosion(
      body.bomVersionId,
      body.projectId || 'proj-eto-demo',
      tenantId,
    );
  }

  @Post('eto-chain/compensate')
  compensate(@Body() body: { correlationId: string }) {
    return this.eto.compensate(body.correlationId);
  }

  @Get('eto-chain/compensations')
  compensations(@Query('correlationId') correlationId?: string, @Query('take') take?: string) {
    return this.eto.listCompensationLog(correlationId, parseInt(take || '20', 10));
  }

  @Post('eto-chain/orchestrate')
  orchestrate(
    @Body() body: { correlationId?: string; projectId?: string; tenantId?: string },
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const correlationId = body.correlationId || `orch-${Date.now()}`;
    const tenantId = body.tenantId || (tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default');
    return this.orchestrator.enqueueChain(
      correlationId,
      body.projectId || 'proj-eto-demo',
      tenantId,
      this.workflow.getStepIds(),
    );
  }

  @Get('eto-chain/orchestrator/status')
  orchestratorStatus(@Query('tenantId') tenantId?: string, @Headers('x-tenant-id') tenantHeader?: string) {
    const tid = tenantId || (tenantHeader && tenantHeader !== 'public' ? tenantHeader : undefined);
    return this.orchestrator.getQueueStatus(tid);
  }

  @Get('eto-chain/workflow')
  workflowDefinition() {
    return this.workflow.getDefinition();
  }

  @Get('eto-chain/workflow/timeouts')
  workflowTimeouts() {
    const def = this.workflow.getDefinition();
    const steps = this.workflow.getStepTimeouts();
    return {
      workflow: def.name,
      version: def.version,
      stepCount: steps.length,
      maxStepTimeoutMs: this.workflow.getMaxStepTimeoutMs(),
      totalChainTimeoutMs: this.workflow.getTotalChainTimeoutMs(),
      steps,
    };
  }

  @Get('eto-chain/temporal/status')
  temporalStatus() {
    return this.temporalBridge.getStatus();
  }

  @Post('eto-chain/temporal/bridge-run')
  temporalBridgeRun(
    @Body() body: { correlationId?: string; tenantId?: string; projectId?: string },
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const correlationId = body.correlationId || `tbridge-${Date.now()}`;
    const tenantId = body.tenantId || (tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default');
    return this.temporalBridge.bridgeRun(correlationId, tenantId, body.projectId || 'proj-temporal-bridge');
  }

  /** TD-003 readiness — orchestrator + temporal + workflow (W29) */
  @Get('eto-chain/saga/readiness')
  async sagaReadiness(@Headers('x-tenant-id') tenantHeader?: string) {
    const tenantId = tenantHeader && tenantHeader !== 'public' ? tenantHeader : 'default';
    const [orchestrator, temporal, workflow] = await Promise.all([
      this.orchestrator.getQueueStatus(tenantId),
      this.temporalBridge.getStatus(),
      Promise.resolve(this.workflow.getDefinition()),
    ]);
    const ready =
      (orchestrator.pending ?? 0) >= 0 &&
      Boolean(workflow.stepCount) &&
      (temporal.mode === 'temporal-connected' || temporal.mode === 'lite-bridge');
    return {
      ready,
      td003: ready ? 'yellow-minimum' : 'partial',
      orchestrator,
      temporal,
      workflow: { name: workflow.name, version: workflow.version, stepCount: workflow.stepCount },
      checkedAt: new Date().toISOString(),
    };
  }
}
