import { InvIntegrationController } from './inv-integration.controller';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';

describe('InvIntegrationController', () => {
  it('creates PO from inv.stock.out.v1 with SHORTAGE meta', async () => {
    const execute = jest.fn();
    const controller = new InvIntegrationController({ execute } as never);

    await controller.handleOutOfStock(
      {
        itemId: 'SKU-A',
        sku: 'SKU-A',
        missingQuantity: 3,
        projectId: 'proj-1',
        wbsElementId: 'wbs-2',
        bomComponentId: 'bc-9',
        tenantId: 'tenant-x',
      },
      { getHeaders: () => undefined } as never,
    );

    expect(execute).toHaveBeenCalledWith(
      new CreatePurchaseOrderCommand('SKU-A', 3, {
        projectId: 'proj-1',
        bomComponentId: 'bc-9',
        tenantId: 'tenant-x',
        source: 'SHORTAGE',
        taskId: 'wbs-2',
      }),
    );
  });
});
