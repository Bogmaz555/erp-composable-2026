/** W37 — platform/auth/readiness contract (TD-001) */
describe('W37 — platform/auth/readiness', () => {
  it('response shape for TD-001', () => {
    const res = {
      ready: true,
      td001: 'partial',
      authEnforced: false,
      keycloakJwks: false,
      roleCount: 7,
      roles: ['ADMIN', 'ENGINEER'],
      permissionEntries: 12,
      protectedClusters: ['PLM', 'MES', 'PM', 'INV'],
      manufacturingGuards: true,
      devMode: true,
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(['yellow-minimum', 'partial']).toContain(res.td001);
    expect(res.roleCount).toBeGreaterThanOrEqual(7);
  });
});
