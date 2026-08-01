/**
 * P0 auth surface smoke — assert 401 without token on protected proxy paths.
 * Optional JWKS path with demo.engineer (Keycloak) when available.
 *
 * Run: npx tsx scripts/smoke-auth-401.ts
 * Env:
 *   GATEWAY_URL (default http://127.0.0.1:4005)
 *   REQUIRE_LIVE=1 — fail if gateway unreachable (default: SKIP when down)
 *   SKIP_JWKS=1 — skip positive bearer/JWKS check
 */
import { execSync } from 'child_process';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const REQUIRE_LIVE = process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE === 'true';

const P0_NO_TOKEN = [
  '/api/analytics/platform',
  '/api/analytics/platform/production/readiness',
  '/api/analytics/import',
  '/api/analytics/import/products',
  '/api/analytics/export',
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

async function run() {
  console.log('=== smoke-auth-401 (P0 proxy surface) ===\n');
  console.log(`GATEWAY_URL=${GW}`);

  const health = await probe('/api/analytics/health');
  if (!health.ok) {
    const msg = `Gateway unreachable: ${(health as { error: string }).error}`;
    if (REQUIRE_LIVE) {
      console.error(`FAIL: ${msg}`);
      process.exit(1);
    }
    console.log(`SKIP: ${msg}`);
    process.exit(0);
  }
  console.log(`✓ gateway reachable (health → ${health.status})`);

  let fails = 0;

  console.log('\n--- No bearer → 401 on P0 paths ---');
  for (const path of P0_NO_TOKEN) {
    const r = await probe(path);
    if (!r.ok) {
      console.log(`✗ ${path} — request failed: ${(r as { error: string }).error}`);
      fails++;
      continue;
    }
    // 401 required (auth boundary). 404 after auth would mean path not registered
    // but still proves auth ran if we got 401 first — without token must be 401.
    const pass = r.status === 401;
    console.log(`${pass ? '✓' : '✗'} ${path} → ${r.status} (want 401)`);
    if (!pass) fails++;
  }

  // Public health must remain open (not 401 solely for missing token).
  const pub = await probe('/api/analytics/health');
  if (pub.ok && pub.status === 401) {
    console.log('✗ /api/analytics/health must stay public (got 401)');
    fails++;
  } else if (pub.ok) {
    console.log(`✓ /api/analytics/health public → ${pub.status}`);
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
        // Auth stack success: not 401/403. 200/404 empty OK; 5xx = fail.
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
