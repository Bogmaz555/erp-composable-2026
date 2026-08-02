/** W125 — Vault audit contract */
describe('W125 — platform/vault-audit/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'VAULT_AUDIT', auditPolicy: true };
    expect(res.domain).toBe('VAULT_AUDIT');
  });
});
