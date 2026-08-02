/**
 * Enterprise Q2 KD-Q2-2: when ENTERPRISE profile + KSEF_MODE=production,
 * refuse boot without KSEF_API_URL + KSEF_TOKEN (fail-closed; secrets never in git).
 */
export function assertKsefEnterpriseBoot(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const enterprise =
    env.ENTERPRISE === '1' ||
    env.ENTERPRISE === 'true' ||
    env.ERP_PROFILE === 'enterprise' ||
    env.NODE_ENV === 'production';
  const mode = env.KSEF_MODE || 'sandbox';
  if (mode !== 'production') return;
  if (!enterprise && env.KSEF_FAIL_CLOSED !== '1') {
    // Non-enterprise: warn path handled by router OnModuleInit
    return;
  }
  const missing: string[] = [];
  if (!env.KSEF_API_URL) missing.push('KSEF_API_URL');
  if (!env.KSEF_TOKEN) missing.push('KSEF_TOKEN');
  if (missing.length) {
    throw new Error(
      `tax-legal ENTERPRISE fail-closed: KSEF_MODE=production requires ${missing.join(', ')} (env/Vault only)`,
    );
  }
}
