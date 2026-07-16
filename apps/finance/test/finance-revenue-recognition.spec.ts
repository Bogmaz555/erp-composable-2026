import { ProjectAccountingService } from '../src/project-accounting.service';
import { Test } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { MilestoneIntegrationController } from '../src/milestone-integration.controller';
import { PrismaService } from '../src/prisma.service';

describe('Finance: revenue recognition on tax.invoice.ksef.sent.v1', () => {
  it('creates RevenueRecognition and emits finance.revenue.recognized.v1', async () => {
    const prisma = {
      milestoneBilling: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      revenueRecognition: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      receivable: { create: jest.fn().mockResolvedValue({}) },
    };
    const commandBus = { execute: jest.fn().mockResolvedValue({}) };

    const moduleRef = await Test.createTestingModule({
      controllers: [MilestoneIntegrationController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: CommandBus, useValue: commandBus },
      ],
    }).compile();

    const controller = moduleRef.get(MilestoneIntegrationController);
    await controller.handleKsefInvoiceSent({
      invoiceId: 'inv-1',
      ksefReferenceNumber: 'KSEF-99',
      projectId: 'proj-1',
      milestone: 'FAT',
      amount: 500000,
      currency: 'PLN',
      sentAt: new Date().toISOString(),
    });

    expect(prisma.revenueRecognition.create).toHaveBeenCalled();
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'finance.revenue.recognized.v1' }),
      }),
    );
    expect(commandBus.execute).toHaveBeenCalled();
  });
});
