import { ProjectAccountingService } from '../src/project-accounting.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { FinanceController } from '../src/finance.controller';
import { PrismaService } from '../src/prisma.service';

describe('Finance: LABOR on mes.production.recorded.v1', () => {
  let controller: FinanceController;
  let commandBus: any;
  let prisma: PrismaService;

  beforeEach(async () => {
    commandBus = { execute: jest.fn().mockResolvedValue({}) };
    const mockPrisma = {
      projectCost: { create: jest.fn().mockResolvedValue({ id: 'pc-labor' }) },
      wipAccount: { upsert: jest.fn().mockResolvedValue({ id: 'wip-1' }) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProjectAccountingService, useValue: {} }
      ],
    }).compile();

    controller = moduleRef.get(FinanceController);
    prisma = moduleRef.get(PrismaService);
  });

  it('books LABOR + OVERHEAD ProjectCost and updates WipAccount.laborCost', async () => {
    await (controller as any).handleProductionRecorded({
      workOrderId: 'wo-labor-1',
      projectId: 'proj-eto-1',
      tenantId: 'tenant-1',
      quantityGood: 1,
      laborHours: 4,
      operatorId: 'op-42',
    });

    expect((prisma as any).projectCost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ costType: 'LABOR', amount: 340 }),
      }),
    );
    expect((prisma as any).projectCost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ costType: 'OVERHEAD' }),
      }),
    );
    expect((prisma as any).wipAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ laborCost: { increment: 340 } }),
      }),
    );
  });

  it('skips when laborHours is zero', async () => {
    await (controller as any).handleProductionRecorded({
      workOrderId: 'wo-2',
      projectId: 'proj-1',
      laborHours: 0,
      quantityGood: 1,
    });
    expect((prisma as any).projectCost.create).not.toHaveBeenCalled();
  });
});
