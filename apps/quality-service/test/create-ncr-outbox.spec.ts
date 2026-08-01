import { CreateNcrCommand, CreateNcrHandler } from '../src/commands/create-ncr.handler';

describe('CreateNcrHandler', () => {
  it('writes quality.ncr.raised.v1 to outbox in $transaction', async () => {
    const outboxCreate = jest.fn().mockResolvedValue({});
    const ncrRow = {
      id: 'ncr-9',
      inspectionId: 'insp-9',
      defectCode: undefined,
      defectDescription: 'crack',
      attachmentIds: [],
      severity: 'HIGH',
      status: 'OPEN',
      projectId: 'proj-9',
      workOrderId: 'WO-9',
      bomComponentId: 'bc-9',
      tenantId: 'default',
      createdAt: new Date(),
    };
    const store = {
      nonConformanceReport: {
        create: jest.fn().mockResolvedValue(ncrRow),
      },
      outboxEvent: { create: outboxCreate },
    };
    const prisma = {
      inspection: { findUnique: jest.fn().mockResolvedValue({ referenceId: 'WO-9' }) },
      ...store,
      $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
    };

    const handler = new CreateNcrHandler(prisma as never);
    await handler.execute(
      new CreateNcrCommand('crack', 'HIGH', {
        inspectionId: 'insp-9',
        projectId: 'proj-9',
        bomComponentId: 'bc-9',
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(store.nonConformanceReport.create).toHaveBeenCalled();
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'quality.ncr.raised.v1' }),
      }),
    );
  });
});
