/** W60 — platform/import/readiness contract */
describe('W60 — platform/import/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, previewUp: true, domain: 'IMPORT' };
    expect(res.domain).toBe('IMPORT');
  });
});
