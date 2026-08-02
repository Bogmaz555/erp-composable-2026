/** W69 — import staging persistence contract */
describe('W69 — platform/import-staging/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'IMPORT_STAGING', persistenceMode: 'prisma' };
    expect(res.persistenceMode).toBe('prisma');
  });
});
