import { TaxLegalController } from '../src/tax-legal.controller';

describe('TaxLegal: KSeF on finance.payment.milestone.reached.v1', () => {
  it('creates invoice SENT + tax.invoice.ksef.sent.v1 outbox in $transaction', async () => {
    const store = {
      taxInvoice: {
        create: jest.fn().mockResolvedValue({ id: 'inv-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      ...store,
      $transaction: jest.fn(async (cb: (tx: typeof store) => Promise<unknown>) => cb(store)),
    };
    const ksef = {
      sendInvoice: jest.fn().mockResolvedValue({ ksefReferenceNumber: 'KSEF-REF-1' }),
      getStatus: jest.fn().mockReturnValue({ mode: 'sandbox' }),
    };
    const jpk = { generateSalesRegister: jest.fn() };
    const jpkKr = { generateLedgerBook: jest.fn() };
    const jpkKrValidator = { validate: jest.fn() };

    const controller = new TaxLegalController(
      prisma as any,
      ksef as any,
      jpk as any,
      jpkKr as any,
      jpkKrValidator as any,
    );

    const result = await controller.onMilestoneInvoice({
      projectId: 'proj-1',
      milestone: 'FAT',
      amount: 150000,
      currency: 'PLN',
    } as any);

    expect(ksef.sendInvoice).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(store.taxInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          ksefReferenceNumber: 'KSEF-REF-1',
          status: 'SENT',
        }),
      }),
    );
    expect(store.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'tax.invoice.ksef.sent.v1' }),
      }),
    );
    expect(result.ksefReferenceNumber).toBe('KSEF-REF-1');
  });
});
