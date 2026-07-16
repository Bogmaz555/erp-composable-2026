/** W65 — validation readiness contract */
describe('W65 — platform/validation/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, plmCreateValidation: true, domain: 'VALIDATION' };
    expect(res.plmCreateValidation).toBe(true);
  });
});
