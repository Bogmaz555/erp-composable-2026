import { assertEtoOperationalPayload } from '../apps/shared-kernel/src/types/eto-operational';

describe('ETO operational payload contract', () => {
  it('requires projectId on material events', () => {
    expect(() =>
      assertEtoOperationalPayload({ itemId: 'x' }, 'pm.material.requested'),
    ).toThrow(/projectId/);
  });

  it('accepts projectId + bomComponentId', () => {
    const ctx = assertEtoOperationalPayload(
      { projectId: 'proj-1', bomComponentId: 'bc-1', tenantId: 'default' },
      'inventory.reservation.created',
    );
    expect(ctx.projectId).toBe('proj-1');
    expect(ctx.bomComponentId).toBe('bc-1');
  });

  it('accepts projectId + wbsElementId for material flow', () => {
    const ctx = assertEtoOperationalPayload(
      { projectId: 'proj-2', wbsElementId: 'wbs-9' },
      'pm.material.requested',
    );
    expect(ctx.wbsElementId).toBe('wbs-9');
  });
});
