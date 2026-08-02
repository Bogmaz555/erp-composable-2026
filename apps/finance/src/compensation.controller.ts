import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { preferJetStreamConsumerPath } from '@erp/shared-kernel';
import { CommandBus } from '@nestjs/cqrs';
import { CompensationMatrixService } from './compensation-matrix.service';
import { ReverseRevenueCommand } from './commands/reverse-revenue.handler';
import { ReleaseCommitmentCommand } from './commands/release-commitment.handler';
import { ReverseMaterialReservationCommand } from './commands/reverse-material-reservation.handler';

@Controller('fin/compensations')
export class CompensationController {
  private readonly logger = new Logger(CompensationController.name);

  constructor(
    private readonly matrix: CompensationMatrixService,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('matrix')
  getMatrix() {
    return {
      matrix: this.matrix.getMatrix(),
      source: 'enterprise-q2-kd-q2-4',
    };
  }

  @Post('run')
  async run(
    @Body()
    body: {
      forwardEvent: string;
      tenantId?: string;
      correlationId: string;
      projectId?: string;
      amount?: number;
      orderRef?: string;
      workOrderId?: string;
    },
  ) {
    return this.matrix.compensate({
      forwardEvent: body.forwardEvent,
      tenantId: body.tenantId || 'default',
      correlationId: body.correlationId,
      projectId: body.projectId,
      amount: body.amount,
      orderRef: body.orderRef,
      workOrderId: body.workOrderId,
    });
  }

  @Post('reverse-revenue')
  reverseRevenue(
    @Body()
    body: {
      projectId: string;
      tenantId?: string;
      correlationId: string;
      amount?: number;
    },
  ) {
    return this.commandBus.execute(
      new ReverseRevenueCommand(
        body.projectId,
        body.tenantId || 'default',
        body.correlationId,
        body.amount,
      ),
    );
  }

  @Post('release-commitment')
  releaseCommitment(
    @Body()
    body: {
      tenantId?: string;
      correlationId: string;
      orderRef?: string;
      amount?: number;
      projectId?: string;
    },
  ) {
    return this.commandBus.execute(
      new ReleaseCommitmentCommand(
        body.tenantId || 'default',
        body.correlationId,
        body.orderRef,
        body.amount,
        undefined,
        body.projectId,
      ),
    );
  }

  @EventPattern('finance.revenue.reversed.v1')
  async onRevenueReverse(
    @Payload() data: Record<string, unknown>,
    fromJetStream = false,
  ) {
    if (!fromJetStream && preferJetStreamConsumerPath()) return;
    this.logger.log(`[Compensation] finance.revenue.reversed.v1 ${data.correlationId}`);
    return this.commandBus.execute(
      new ReverseRevenueCommand(
        String(data.projectId || ''),
        String(data.tenantId || 'default'),
        String(data.correlationId || data.eventId || ''),
        data.amount != null ? Number(data.amount) : undefined,
        data.eventId ? String(data.eventId) : undefined,
      ),
    );
  }

  @EventPattern('finance.commitment.released.v1')
  async onCommitmentRelease(
    @Payload() data: Record<string, unknown>,
    fromJetStream = false,
  ) {
    if (!fromJetStream && preferJetStreamConsumerPath()) return;
    this.logger.log(
      `[Compensation] finance.commitment.released.v1 ${data.correlationId || data.orderRef}`,
    );
    return this.commandBus.execute(
      new ReleaseCommitmentCommand(
        String(data.tenantId || 'default'),
        String(data.correlationId || data.eventId || data.orderRef || ''),
        data.orderRef ? String(data.orderRef) : undefined,
        data.amount != null ? Number(data.amount) : undefined,
        data.eventId ? String(data.eventId) : undefined,
        data.projectId ? String(data.projectId) : undefined,
      ),
    );
  }

  /** INV reservation restore / release → finance material reverse hook */
  @EventPattern('inventory.reservation.restored')
  async onReservationRestored(@Payload() data: Record<string, unknown>) {
    const workOrderId = String(data.workOrderId || data.correlationId || '');
    const correlationId = String(data.correlationId || workOrderId);
    if (!workOrderId && !correlationId) return;
    this.logger.log(`[Compensation] inventory.reservation.restored WO=${workOrderId}`);
    return this.commandBus.execute(
      new ReverseMaterialReservationCommand(
        String(data.tenantId || 'default'),
        workOrderId,
        correlationId,
        data.projectId ? String(data.projectId) : undefined,
      ),
    );
  }

  /** Matrix documents inventory.reservation.released.v1 as compensation for reserve */
  @EventPattern('inventory.reservation.released.v1')
  async onReservationReleasedComp(
    @Payload() data: Record<string, unknown> & { compensate?: boolean },
  ) {
    if (!data?.compensate) return;
    const workOrderId = String(data.workOrderId || data.correlationId || '');
    const correlationId = String(data.correlationId || workOrderId);
    if (!workOrderId && !correlationId) return;
    this.logger.log(
      `[Compensation] inventory.reservation.released.v1 (compensate) WO=${workOrderId}`,
    );
    return this.commandBus.execute(
      new ReverseMaterialReservationCommand(
        String(data.tenantId || 'default'),
        workOrderId,
        correlationId,
        data.projectId ? String(data.projectId) : undefined,
      ),
    );
  }
}
