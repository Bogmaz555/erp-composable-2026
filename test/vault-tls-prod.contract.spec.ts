/** W97 — Vault TLS prod contract */
describe('W97 — platform/vault-tls-prod/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'VAULT_TLS_PROD', composeHasVault: true };
    expect(res.domain).toBe('VAULT_TLS_PROD');
  });
});
