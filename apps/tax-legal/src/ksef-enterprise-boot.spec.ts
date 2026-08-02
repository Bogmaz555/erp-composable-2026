import { assertKsefEnterpriseBoot } from './ksef-enterprise-boot';

describe('KSeF enterprise boot assert (Q2)', () => {
  it('allows sandbox default under ENTERPRISE', () => {
    expect(() =>
      assertKsefEnterpriseBoot({
        ENTERPRISE: '1',
        KSEF_MODE: 'sandbox',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('fails closed when ENTERPRISE + production without token', () => {
    expect(() =>
      assertKsefEnterpriseBoot({
        ENTERPRISE: '1',
        KSEF_MODE: 'production',
        KSEF_API_URL: 'https://ksef.example',
      } as NodeJS.ProcessEnv),
    ).toThrow(/fail-closed|KSEF_TOKEN/);
  });

  it('passes when production fully configured', () => {
    expect(() =>
      assertKsefEnterpriseBoot({
        ENTERPRISE: '1',
        KSEF_MODE: 'production',
        KSEF_API_URL: 'https://ksef.example',
        KSEF_TOKEN: 'test-token-not-real',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('does not fail non-enterprise production without config (router handles runtime)', () => {
    expect(() =>
      assertKsefEnterpriseBoot({
        KSEF_MODE: 'production',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });
});
