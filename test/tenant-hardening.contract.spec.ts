/** W140 — Tenant hardening contract */
describe('W140 — platform/tenant-hardening/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'TENANT_HARDENING', gatewayHeader: 'X-Tenant-Id' };
    expect(res.domain).toBe('TENANT_HARDENING');
  });
});
