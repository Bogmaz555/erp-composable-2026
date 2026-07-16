import { ProcIntegrationController } from './proc-integration.controller';
import { PrismaService } from './prisma.service';

describe('ProcIntegrationController', () => {
  it('updates WBS by taskId on PO approved', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { wbsElement: { updateMany } } as unknown as PrismaService;
    const controller = new ProcIntegrationController(prisma);

    await controller.handlePoApproved({
      orderId: 'po-1',
      sku: 'SKU-A',
      quantity: 2,
      taskId: 'wbs-1',
      projectId: 'proj-1',
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'wbs-1' },
      data: { status: 'PROCUREMENT_APPROVED' },
    });
  });

  it('falls back to projectId + bomComponentId', async () => {
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 2 });
    const prisma = { wbsElement: { updateMany } } as unknown as PrismaService;
    const controller = new ProcIntegrationController(prisma);

    await controller.handlePoApproved({
      orderId: 'po-2',
      sku: 'SKU-B',
      quantity: 1,
      projectId: 'proj-2',
      bomComponentId: 'bc-2',
    });

    expect(updateMany).toHaveBeenLastCalledWith({
      where: { projectId: 'proj-2', bomComponentId: 'bc-2' },
      data: { status: 'PROCUREMENT_APPROVED' },
    });
  });
});
