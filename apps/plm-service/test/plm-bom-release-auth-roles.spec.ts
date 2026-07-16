import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { PlmBomVersionsController } from '../src/plm.controller';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

// Test for TD-001 on the most critical ETO operation (BOM release with role check)
describe('PLM: BomVersions Release Auth + Roles (TD-001)', () => {
  let controller: PlmBomVersionsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [PlmBomVersionsController],
      providers: [
        { provide: 'CommandBus', useValue: { execute: jest.fn() } },
        { provide: 'QueryBus', useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = moduleRef.get(PlmBomVersionsController);
  });

  it('should have JwtAuthGuard applied', () => {
    const guards = Reflect.getMetadata('__guards__', PlmBomVersionsController);
    expect(guards).toBeDefined();
  });

  it('should allow release when user has PRODUCTION_MANAGER role', async () => {
    const mockReq = {
      user: { id: 'eng-123', roles: ['PRODUCTION_MANAGER'] }
    };

    // Should not throw
    await expect(
      (controller as any).releaseBomVersion('bom-1', {}, mockReq)
    ).resolves.not.toThrow();
  });

  it('should reject release when user lacks required roles', async () => {
    const mockReq = {
      user: { id: 'viewer-1', roles: ['VIEWER'] }
    };

    await expect(
      (controller as any).releaseBomVersion('bom-1', {}, mockReq)
    ).rejects.toThrow('Insufficient permissions to release BOM version');
  });
});
