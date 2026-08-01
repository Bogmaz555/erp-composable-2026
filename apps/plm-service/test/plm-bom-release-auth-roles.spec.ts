import { PlmBomVersionsController } from '../src/plm.controller';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { canPerformEtoMutation, ETO_MUTATION_ROLES } from '@erp/shared-kernel';

// Test for TD-001 on the most critical ETO operation (BOM release with role matrix)
describe('PLM: BomVersions Release Auth + Roles (TD-001)', () => {
  it('should have JwtAuthGuard + RolesGuard applied', () => {
    const guards = Reflect.getMetadata('__guards__', PlmBomVersionsController);
    expect(guards).toBeDefined();
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  it('should decorate release with PLM_BOM_RELEASE roles', () => {
    const roles = Reflect.getMetadata(
      'roles',
      PlmBomVersionsController.prototype.releaseBomVersion,
    );
    expect(roles).toEqual(expect.arrayContaining([...ETO_MUTATION_ROLES.PLM_BOM_RELEASE]));
  });

  it('matrix: ENGINEER / PRODUCTION_MANAGER / ADMIN may release; VIEWER denied', () => {
    expect(canPerformEtoMutation(['ENGINEER'], 'PLM_BOM_RELEASE')).toBe(true);
    expect(canPerformEtoMutation(['PRODUCTION_MANAGER'], 'PLM_BOM_RELEASE')).toBe(true);
    expect(canPerformEtoMutation(['ADMIN'], 'PLM_BOM_RELEASE')).toBe(true);
    expect(canPerformEtoMutation(['VIEWER'], 'PLM_BOM_RELEASE')).toBe(false);
    expect(canPerformEtoMutation(['PROCUREMENT'], 'PLM_BOM_RELEASE')).toBe(false);
  });
});
