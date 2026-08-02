import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Connection, Client } from '@temporalio/client';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ApprovalsServiceService implements OnModuleInit {
  private temporalClient: Client;

  constructor(
    @Inject('APPROVALS_PUBLISHER') private readonly natsClient: ClientProxy,
  ) {}

  async onModuleInit() {
    const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' });
    this.temporalClient = new Client({ connection });
    console.log('ApprovalsService connected to Temporal.');
  }

  async startApproval(entityId: string, entityType: string) {
    const workflowId = `approval-${entityType}-${entityId}`;
    await this.temporalClient.workflow.start('approvalWorkflow', {
      args: [entityId, entityType],
      taskQueue: 'approvals',
      workflowId,
    });
    return workflowId;
  }

  async signalApproval(entityId: string, action: 'approve' | 'reject') {
    // Note: We use a wildcard approach or expect entityId to map to workflowId.
    // For simplicity we assume entityId passed here IS the workflowId.
    const handle = this.temporalClient.workflow.getHandle(entityId);
    await handle.signal(action);
    
    // Publish resolution event
    this.natsClient.emit('approval.resolved.v1', {
      workflowId: entityId,
      status: action === 'approve' ? 'APPROVED' : 'REJECTED'
    });
  }
}
