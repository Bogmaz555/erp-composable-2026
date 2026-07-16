import { CreateNcrCommand, CreateNcrHandler } from '../src/commands/create-ncr.handler';

describe('CreateNcrHandler', () => {
  it('writes quality.ncr.raised.v1 to outbox', async () => {
    const outboxCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      inspection: { findUnique: jest.fn().mockResolvedValue({ referenceId: 'WO-9' }) },
      nonConformanceReport: {
        create: jest.fn().mockResolvedValue({
          id: 'ncr-9',
          inspectionId: 'insp-9',
          defectDescription: 'crack',
          severity: 'HIGH',
          status: 'OPEN',
          projectId: 'proj-9',
          workOrderId: 'WO-9',
          bomComponentId: 'bc-9',
          tenantId: 'default',
          createdAt: new Date(),
        }),
      },
      outboxEvent: { create: outboxCreate },
    };

    const handler = new CreateNcrHandler(prisma as never);
    await handler.execute(
      new CreateNcrCommand('insp-9', 'crack', 'HIGH', {
        projectId: 'proj-9',
        bomComponentId: 'bc-9',
      }),
    );

    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'quality.ncr.raised.v1' }),
      }),
    );
  });
});
