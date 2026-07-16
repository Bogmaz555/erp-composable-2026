import { ProcIntegrationController } from '../src/proc-integration.controller';

describe('ProcIntegrationController', () => {
  it('increments stock on material received', async () => {
    const item = { id: 'item-1', sku: 'SKU-1' };
    const stock = { id: 'sl-1', quantity: 10 };
    const update = jest.fn().mockResolvedValue({ quantity: 15 });
    const createTx = jest.fn().mockResolvedValue({});

    const prisma = {
      item: { findUnique: jest.fn().mockResolvedValue(item) },
      stockLevel: {
        findFirst: jest.fn().mockResolvedValue(stock),
        update,
        create: jest.fn(),
      },
      stockTransaction: { create: createTx },
    };

    const controller = new ProcIntegrationController(prisma as never);
    const result = await controller.handleMaterialReceived({
      purchaseOrderId: 'po-1',
      sku: 'SKU-1',
      quantity: 5,
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'sl-1' },
      data: { quantity: 15 },
    });
    expect(createTx).toHaveBeenCalled();
  });
});
