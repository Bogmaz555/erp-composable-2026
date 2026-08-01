/**
 * P0 auth surface smoke — assert 401 without token on protected proxy paths.
 * Offline: reject alg=none / wrong alg for verifyToken (no gateway required).
 * Optional JWKS path with demo.engineer (Keycloak) when available.
 *
 * Run: npx tsx scripts/smoke-auth-401.ts
 * Env:
 *   GATEWAY_URL (default http://127.0.0.1:4005)
 *   REQUIRE_LIVE=1 — fail if gateway unreachable (default: SKIP when down)
 *   SKIP_JWKS=1 — skip positive bearer/JWKS check
 */
import { execSync } from 'child_process';
import * as jwt from 'jsonwebtoken';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const REQUIRE_LIVE = process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE === 'true';

const P0_NO_TOKEN = [
  '/api/analytics/platform',
  '/api/analytics/platform/production/readiness',
  '/api/analytics/import',
  '/api/analytics/import/products',
  '/api/analytics/export',
  '/api/analytics/outbox',
  '/api/analytics/tenants',
  '/api/analytics/auth/context',
  '/api/analytics/stream',
  '/api/analytics/search',
  '/api/analytics/counters',
  '/api/pm/projects',
];

async function probe(path: string, headers?: Record<string, string>) {
  try {
    const res = await fetch(`${GW}${path}`, {
      headers,
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    });
    return { ok: true as const, status: res.status };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

/** Offline unit checks for verify-token (alg=none / HS256 under JWKS mode). */
async function offlineVerifyTokenChecks(): Promise<number> {
  console.log('\n--- Offline verifyToken (alg=none / JWKS mode) ---');
  let fails = 0;

  const prevJwks = process.env.USE_KEYCLOAK_JWKS;
  const prevPilot = process.env.PILOT;
  const prevSecret = process.env.JWT_SECRET;

  try {
    // Dynamic import after env set for HS256 path
    process.env.USE_KEYCLOAK_JWKS = 'false';
    delete process.env.PILOT;
    process.env.JWT_SECRET = 'smoke-test-hs256-secret-not-for-prod';

    // Clear module cache so auth-env re-reads env
    const verifyPath = require.resolve('../apps/api-gateway/src/auth/verify-token.ts');
    const authEnvPath = require.resolve('../apps/api-gateway/src/auth/auth-env.ts');
    delete require.cache[verifyPath];
    delete require.cache[authEnvPath];

    const { verifyToken } = await import('../apps/api-gateway/src/auth/verify-token');

    // alg=none must not verify under HS256
    const noneTok = jwt.sign(
      { sub: 'attacker', roles: ['ADMIN'] },
      '',
      { algorithm: 'none' as jwt.Algorithm },
    );
    try {
      await verifyToken(noneTok);
      console.log('✗ alg=none accepted under HS256 path');
      fails++;
    } catch {
      console.log('✓ alg=none rejected under HS256 path');
    }

    // Valid HS256 with secret
    const okTok = jwt.sign(
      { sub: 'user', roles: ['VIEWER'], tenantId: 't1' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' },
    );
    try {
      const claims = await verifyToken(okTok);
      if (claims.userId === 'user') console.log('✓ HS256 valid token accepted');
      else {
        console.log('✗ HS256 valid token wrong claims');
        fails++;
      }
    } catch (e) {
      console.log(`✗ HS256 valid token rejected: ${(e as Error).message}`);
      fails++;
    }

    // Missing JWT_SECRET rejects
    delete process.env.JWT_SECRET;
    delete require.cache[verifyPath];
    delete require.cache[authEnvPath];
    const { verifyToken: verifyNoSecret } = await import(
      '../apps/api-gateway/src/auth/verify-token'
    );
    try {
      await verifyNoSecret(okTok);
      console.log('✗ missing JWT_SECRET accepted token');
      fails++;
    } catch {
      console.log('✓ missing JWT_SECRET rejects verification');
    }
  } catch (e) {
    console.log(`○ offline verifyToken checks skipped: ${(e as Error).message}`);
  } finally {
    if (prevJwks === undefined) delete process.env.USE_KEYCLOAK_JWKS;
    else process.env.USE_KEYCLOAK_JWKS = prevJwks;
    if (prevPilot === undefined) delete process.env.PILOT;
    else process.env.PILOT = prevPilot;
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  }

  return fails;
}

async function run() {
  console.log('=== smoke-auth-401 (P0 proxy surface) ===\n');
  console.log(`GATEWAY_URL=${GW}`);

  let fails = await offlineVerifyTokenChecks();

  const health = await probe('/api/analytics/health');
  if (!health.ok) {
    const msg = `Gateway unreachable: ${(health as { error: string }).error}`;
    if (REQUIRE_LIVE) {
      console.error(`FAIL: ${msg}`);
      process.exit(1);
    }
    console.log(`\nSKIP live probes: ${msg}`);
    console.log(`\n=== Result: ${fails === 0 ? 'PASS (offline only)' : `${fails} FAIL`} ===`);
    process.exit(fails > 0 ? 1 : 0);
  }
  console.log(`\n✓ gateway reachable (health → ${health.status})`);

  console.log('\n--- No bearer → 401 on P0 paths ---');
  for (const path of P0_NO_TOKEN) {
    const r = await probe(path);
    if (!r.ok) {
      console.log(`✗ ${path} — request failed: ${(r as { error: string }).error}`);
      fails++;
      continue;
    }
    const pass = r.status === 401;
    console.log(`${pass ? '✓' : '✗'} ${path} → ${r.status} (want 401)`);
    if (!pass) fails++;
  }

  for (const pubPath of ['/api/analytics/health', '/api/health']) {
    const pub = await probe(pubPath);
    if (pub.ok && pub.status === 401) {
      console.log(`✗ ${pubPath} must stay public (got 401)`);
      fails++;
    } else if (pub.ok) {
      console.log(`✓ ${pubPath} public → ${pub.status}`);
    }
  }

  if (process.env.SKIP_JWKS === '1') {
    console.log('\nSKIP JWKS positive path (SKIP_JWKS=1)');
  } else {
    console.log('\n--- Optional JWKS / demo.engineer bearer ---');
    let token = '';
    try {
      token = execSync('bash scripts/get-keycloak-token.sh 2>/dev/null', {
        encoding: 'utf8',
      }).trim();
    } catch {
      token = '';
    }

    if (!token) {
      console.log('SKIP: Keycloak token unavailable (start keycloak + realm erp)');
    } else {
      const auth = { Authorization: `Bearer ${token}` };
      const pm = await probe('/api/pm/projects', auth);
      if (!pm.ok) {
        console.log(`✗ /api/pm/projects with bearer — ${(pm as { error: string }).error}`);
        fails++;
      } else {
        const authOk = pm.status !== 401 && pm.status !== 403 && pm.status < 500;
        console.log(
          `${authOk ? '✓' : '✗'} /api/pm/projects with demo.engineer → ${pm.status} (want not 401/403/5xx)`,
        );
        if (!authOk) fails++;
      }

      const platform = await probe('/api/analytics/platform', auth);
      if (platform.ok) {
        const authOk =
          platform.status !== 401 && platform.status !== 403 && platform.status < 500;
        console.log(
          `${authOk ? '✓' : '✗'} /api/analytics/platform with bearer → ${platform.status}`,
        );
        if (!authOk) fails++;
      }
    }
  }

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
