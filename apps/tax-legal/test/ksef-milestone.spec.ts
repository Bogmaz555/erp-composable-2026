import { Test } from '@nestjs/testing';
import { TaxLegalController } from '../src/tax-legal.controller';
import { KsefSandboxService } from '../src/ksef-sandbox.service';
import { PrismaService } from '../src/prisma.service';

describe('TaxLegal: KSeF on finance.payment.milestone.reached.v1', () => {
  it('creates invoice and emits tax.invoice.ksef.sent.v1 outbox', async () => {
    const prisma = {
      taxInvoice: {
        create: jest.fn().mockResolvedValue({ id: 'inv-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const ksef = { sendInvoice: jest.fn().mockResolvedValue({ ksefReferenceNumber: 'KSEF-REF-1' }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [TaxLegalController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: KsefSandboxService, useValue: ksef },
      ],
    }).compile();

    const controller = moduleRef.get(TaxLegalController);
    const result = await controller.onMilestoneInvoice({
      projectId: 'proj-1',
      milestone: 'FAT',
      amount: 150000,
      currency: 'PLN',
    });

    expect(ksef.sendInvoice).toHaveBeenCalled();
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'tax.invoice.ksef.sent.v1' }) }),
    );
    expect(result.ksefReferenceNumber).toBe('KSEF-REF-1');
  });
});
