import { FinanceIntegrationController } from '../src/finance-integration.controller';

describe('CRM FinanceIntegrationController', () => {
  it('updates paymentMilestones on KSeF sent', async () => {
    const milestones = [
      { id: 'm1', phase: 'Gotowość FAT', percentage: 40, status: 'PENDING' },
    ];
    const prisma = {
      opportunity: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'opp-1',
          linkedProjectId: 'proj-1',
          paymentMilestones: milestones,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const controller = new FinanceIntegrationController(prisma as any);
    await controller.onKsefSent({
      invoiceId: 'inv-1',
      ksefReferenceNumber: 'KSEF-1',
      projectId: 'proj-1',
      milestone: 'FAT',
      amount: 400000,
      currency: 'PLN',
      sentAt: new Date().toISOString(),
    });

    expect(prisma.opportunity.update).toHaveBeenCalled();
    const data = prisma.opportunity.update.mock.calls[0][0].data.paymentMilestones as any[];
    expect(data.some((m) => m.status === 'INVOICED')).toBe(true);
  });
});
