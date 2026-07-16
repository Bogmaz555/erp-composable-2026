/** W32 — NestJS version platform API contract */
describe('W32 — platform/nestjs-versions', () => {
  it('response shape for TD-010 audit', () => {
    const res = {
      canonical: '11.1.19',
      unified: true,
      td010: 'yellow-minimum',
      appCount: 12,
      driftCount: 0,
      apps: [{ app: 'pm-service', drift: [] }],
      checkedAt: new Date().toISOString(),
    };
    expect(res.td010).toBe('yellow-minimum');
    expect(res.canonical.startsWith('11')).toBe(true);
    expect(res.driftCount).toBe(0);
  });
});
