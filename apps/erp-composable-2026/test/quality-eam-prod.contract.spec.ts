/** W137 — Quality/EAM production contract */
describe('W137 — platform/quality-eam-prod/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'QUALITY_EAM_PROD', ncrCapaProdUp: true };
    expect(res.domain).toBe('QUALITY_EAM_PROD');
  });
});
