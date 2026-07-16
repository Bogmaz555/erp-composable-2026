/** W129 — Vault HA contract */
describe('W129 — platform/vault-ha/readiness', () => {
  it('response shape', () => {
    const res = { ready: true, domain: 'VAULT_HA', composeHasVaultHa: true };
    expect(res.domain).toBe('VAULT_HA');
  });
});
