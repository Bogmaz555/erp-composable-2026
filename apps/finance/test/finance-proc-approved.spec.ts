import { ProjectAccountingService } from '../src/project-accounting.service';
import { bookProcurementCommitment } from '../src/proc-commitment';
import { computeMaterialCommitmentPln } from '../src/eto-project-costing';

describe('bookProcurementCommitment', () => {
  it('books project cost and journal for approved PO', async () => {
    const projectCostCreate = jest.fn().mockResolvedValue({});
    const wipUpsert = jest.fn().mockResolvedValue({});
    const accountUpsert = jest.fn().mockResolvedValue({ id: 'acc-201', code: '201-AP' });
    const execute = jest.fn().mockResolvedValue({});

    const prisma = {
      projectCost: { create: projectCostCreate },
      wipAccount: { upsert: wipUpsert },
      account: { upsert: accountUpsert },
    };

    const logger = { log: jest.fn(), warn: jest.fn() };

    await bookProcurementCommitment(
      prisma as never,
      { execute } as never,
      {
        orderId: 'po-1',
        sku: 'BOLT',
        quantity: 10,
        projectId: 'proj-1',
      },
      logger,
    );

    const expected = computeMaterialCommitmentPln(10);
    expect(projectCostCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: 'proj-1', amount: expected }),
      }),
    );
    expect(execute).toHaveBeenCalled();
  });
});
