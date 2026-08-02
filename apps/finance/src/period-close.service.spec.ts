import { BadRequestException } from '@nestjs/common';
import {
  PeriodCloseService,
  PeriodClosedError,
  currentPeriodKey,
} from './period-close.service';

describe('PeriodCloseService (Q2)', () => {
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

  it('currentPeriodKey is YYYY-MM', () => {
    expect(currentPeriodKey()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('assertPostingAllowed allows OPEN', async () => {
    const svc = new PeriodCloseService(mockPrisma('OPEN'));
    await expect(svc.assertPostingAllowed('default')).resolves.toBeUndefined();
  });

  it('assertPostingAllowed refuses CLOSED with BadRequestException', async () => {
    const svc = new PeriodCloseService(mockPrisma('CLOSED'));
    await expect(svc.assertPostingAllowed('default')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('assertOpenForPosting throws PeriodClosedError', async () => {
    const svc = new PeriodCloseService(mockPrisma('CLOSED'));
    await expect(svc.assertOpenForPosting('default')).rejects.toBeInstanceOf(
      PeriodClosedError,
    );
  });

  it('close sets CLOSED with actor audit', async () => {
    const prisma = mockPrisma('OPEN');
    const svc = new PeriodCloseService(prisma);
    const result = await svc.close('default', periodKey, 'auditor-1', 'month end');
    expect(result.status).toBe('CLOSED');
    expect(result.closedBy).toBe('auditor-1');
    expect(prisma.accountingPeriod.update).toHaveBeenCalled();
  });
});
