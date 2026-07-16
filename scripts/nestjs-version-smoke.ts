/**
 * W32 — NestJS version smoke (TD-010)
 */
import * as fs from 'fs';
import * as path from 'path';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const ROOT = path.join(__dirname, '..');

async function run() {
  console.log('=== NestJS Version Smoke (W32 / TD-010) ===\n');
  let fails = 0;

  const res = await fetch(`${GW}/api/analytics/platform/nestjs-versions`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.log(`✗ platform/nestjs-versions → ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log(`✓ canonical=${body.canonical} unified=${body.unified} td010=${body.td010}`);
  console.log(`  apps=${body.appCount} drift=${body.driftCount}`);

  if (!body.unified) fails++;
  if (body.td010 !== 'yellow-minimum') fails++;
  if (!body.canonical?.startsWith('11')) fails++;

  const canon = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'infra/nestjs-version-canonical.json'), 'utf8'),
  );
  if (canon.canonical !== body.canonical) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
