import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ReverseWipCostCommand } from './commands/reverse-wip-cost.handler';
import { ReverseRevenueCommand } from './commands/reverse-revenue.handler';
import { ReleaseCommitmentCommand } from './commands/release-commitment.handler';
import { ReverseMaterialReservationCommand } from './commands/reverse-material-reservation.handler';

/**
 * Enterprise Q2 — financial compensations matrix (KD-Q2-4).
 *
 * | Forward              | Compensation                         |
 * |----------------------|--------------------------------------|
 * | WIP post             | finance.wip.cost.reversed            |
 * | INV reserve          | inventory.reservation.released.v1    |
 * | KSeF / revenue       | reverse revenue journal (correlation)|
 * | PO commit (money)    | finance.commitment.released.v1       |
 */
export const COMPENSATION_MATRIX = {
  'finance.wip.cost.recorded': 'finance.wip.cost.reversed',
  'inventory.reservation.created.v1': 'inventory.reservation.released.v1',
  'inventory.stock.reserved.v1': 'inventory.reservation.released.v1',
  'finance.revenue.recognized.v1': 'finance.revenue.reversed.v1',
  'tax.invoice.ksef.sent.v1': 'finance.revenue.reversed.v1',
  'proc.purchaseorder.approved.v1': 'finance.commitment.released.v1',
} as const;

@Injectable()
export class CompensationMatrixService {
  private readonly logger = new Logger(CompensationMatrixService.name);

  constructor(private readonly commandBus: CommandBus) {}

  getMatrix() {
    return { ...COMPENSATION_MATRIX };
  }

  /**
   * Dispatch compensation for a known forward event type.
   * INV reservation release is primarily emitted by inv-service;
   * finance also reverses material WIP when compensate path runs here.
   */
  async compensate(input: {
    forwardEvent: string;
    tenantId: string;
    correlationId: string;
    projectId?: string;
    amount?: number;
    orderRef?: string;
    eventId?: string;
    workOrderId?: string;
  }) {
    const compensation =
      COMPENSATION_MATRIX[input.forwardEvent as keyof typeof COMPENSATION_MATRIX];
    if (!compensation) {
      return { ok: false, reason: 'unknown_forward', forwardEvent: input.forwardEvent };
    }

    this.logger.log(
      `[Compensation] ${input.forwardEvent} → ${compensation} correlation=${input.correlationId}`,
    );

    switch (compensation) {
      case 'finance.wip.cost.reversed':
        return this.commandBus.execute(
          new ReverseWipCostCommand(
            input.projectId || 'unknown',
            input.tenantId,
            input.correlationId,
            input.eventId,
          ),
        );
      case 'finance.revenue.reversed.v1':
        return this.commandBus.execute(
          new ReverseRevenueCommand(
            input.projectId || 'unknown',
            input.tenantId,
            input.correlationId,
            input.amount,
            input.eventId,
          ),
        );
      case 'finance.commitment.released.v1':
        return this.commandBus.execute(
          new ReleaseCommitmentCommand(
            input.tenantId,
            input.correlationId,
            input.orderRef,
            input.amount,
            input.eventId,
            input.projectId,
          ),
        );
      case 'inventory.reservation.released.v1':
        return this.commandBus.execute(
          new ReverseMaterialReservationCommand(
            input.tenantId,
            input.workOrderId || input.correlationId,
            input.correlationId,
            input.projectId,
            input.eventId,
          ),
        );
      default:
        return { ok: false, reason: 'unhandled_compensation', compensation };
    }
  }
}
