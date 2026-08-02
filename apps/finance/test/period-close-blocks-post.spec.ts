import { BadRequestException } from '@nestjs/common';
import { PeriodCloseService, currentPeriodKey } from '../src/period-close.service';

describe('Period close blocks postings (Q2 PR1)', () => {
  const periodKey = currentPeriodKey();

  function mockPrisma(status: string) {
    return {
      accountingPeriod: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          tenantId: 'default',
          periodKey,
          status,
        }),
        upsert: jest.fn().mockResolvedValue({
          id: 'p1',
          tenantId: 'default',
          periodKey,
          status,
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: 'p1',
            tenantId: 'default',
            periodKey,
            ...data,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
  }

  it('assertPostingAllowed refuses CLOSED', async () => {
    const svc = new PeriodCloseService(mockPrisma('CLOSED'));
    await expect(svc.assertPostingAllowed('default')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('assertPostingAllowed allows OPEN', async () => {
    const svc = new PeriodCloseService(mockPrisma('OPEN'));
    await expect(svc.assertPostingAllowed('default')).resolves.toBeUndefined();
  });

  it('close is idempotent when already CLOSED', async () => {
    const svc = new PeriodCloseService(mockPrisma('CLOSED'));
    const r = await svc.close('default', periodKey, 'admin');
    expect(r.status).toBe('CLOSED');
    expect((r as any).idempotent).toBe(true);
  });
});
