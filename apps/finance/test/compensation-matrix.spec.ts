import { COMPENSATION_MATRIX, CompensationMatrixService } from '../src/compensation-matrix.service';

describe('Compensation matrix (Q2 PR4 KD-Q2-4)', () => {
  it('covers WIP, reservation, revenue, PO commit', () => {
    expect(COMPENSATION_MATRIX['finance.wip.cost.recorded']).toBe(
      'finance.wip.cost.reversed',
    );
    expect(COMPENSATION_MATRIX['inventory.reservation.created.v1']).toBe(
      'inventory.reservation.released.v1',
    );
    expect(COMPENSATION_MATRIX['tax.invoice.ksef.sent.v1']).toBe(
      'finance.revenue.reversed.v1',
    );
    expect(COMPENSATION_MATRIX['finance.revenue.recognized.v1']).toBe(
      'finance.revenue.reversed.v1',
    );
    expect(COMPENSATION_MATRIX['proc.purchaseorder.approved.v1']).toBe(
      'finance.commitment.released.v1',
    );
  });

  it('dispatches reverse revenue via command bus', async () => {
    const execute = jest.fn().mockResolvedValue({ ok: true });
    const svc = new CompensationMatrixService({ execute } as any);
    await svc.compensate({
      forwardEvent: 'tax.invoice.ksef.sent.v1',
      tenantId: 'default',
      correlationId: 'corr-1',
      projectId: 'proj-1',
      amount: 100,
    });
    expect(execute).toHaveBeenCalled();
    const cmd = execute.mock.calls[0][0];
    expect(cmd.correlationId).toBe('corr-1');
    expect(cmd.projectId).toBe('proj-1');
  });

  it('dispatches material reverse for reservation compensation', async () => {
    const execute = jest.fn().mockResolvedValue({ ok: true });
    const svc = new CompensationMatrixService({ execute } as any);
    await svc.compensate({
      forwardEvent: 'inventory.reservation.created.v1',
      tenantId: 'default',
      correlationId: 'corr-res',
      workOrderId: 'wo-1',
      projectId: 'proj-1',
    });
    expect(execute).toHaveBeenCalled();
  });

  it('returns unknown_forward for unmapped events', async () => {
    const svc = new CompensationMatrixService({ execute: jest.fn() } as any);
    const r = await svc.compensate({
      forwardEvent: 'unknown.event.v1',
      tenantId: 'default',
      correlationId: 'x',
    });
    expect(r).toMatchObject({ ok: false, reason: 'unknown_forward' });
  });
});
