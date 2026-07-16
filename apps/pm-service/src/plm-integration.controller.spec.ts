import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { PlmIntegrationController } from './plm-integration.controller';
import { AddWbsElementCommand } from './commands/add-wbs-element.command';
import { RequestMaterialCommand } from './commands/request-material.handler';
import { LinkProjectBomCommand } from './commands/link-project-bom.command';
import type { PlmBomReleasedV2Event } from '@erp/shared-kernel';

describe('PM PlmIntegrationController (plm.bom.released.v2)', () => {
  let controller: PlmIntegrationController;
  let commandBus: jest.Mocked<CommandBus>;

  const payload: PlmBomReleasedV2Event = {
    bomVersionId: 'bom-v-1',
    itemId: 'machine-1',
    revision: 'A',
    projectId: 'proj-eto-1',
    tenantId: 'tenant-1',
    components: [
      {
        bomComponentId: 'bc-1',
        childItemId: 'motor-001',
        childPartNumber: 'MTR-001',
        quantity: 2,
      },
    ],
  };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn().mockImplementation((cmd) => {
        if (cmd instanceof AddWbsElementCommand) {
          return Promise.resolve({ id: 'wbs-root-1' });
        }
        return Promise.resolve({ success: true });
      }),
    } as unknown as jest.Mocked<CommandBus>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PlmIntegrationController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();

    controller = moduleRef.get(PlmIntegrationController);
  });

  it('should link project, explode WBS and request materials with bomComponentId', async () => {
    const result = await (controller as any).processBomReleased(payload, 'user-engineer-1');

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(LinkProjectBomCommand),
    );
    const materialCalls = commandBus.execute.mock.calls.filter(
      (c) => c[0] instanceof RequestMaterialCommand,
    );
    expect(materialCalls.length).toBeGreaterThanOrEqual(1);
    const matCmd = materialCalls[0][0] as RequestMaterialCommand;
    expect(matCmd.sku).toBe('motor-001');
    expect(matCmd.bomComponentId).toBe('bc-1');
    expect(matCmd.tenantId).toBe('tenant-1');
    expect(result.componentsProcessed).toBe(1);
    expect(result.projectId).toBe('proj-eto-1');
  });
});
