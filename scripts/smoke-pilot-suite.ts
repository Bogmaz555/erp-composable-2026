/**
 * Pilot v1 smoke suite orchestrator (PR 20).
 *
 * Runs honest existing smokes (structure + optional live). Structure checks
 * PASS when live stack is down; fail-closed live paths only when REQUIRE_LIVE=1
 * (honored by child scripts that support it).
 *
 * Usage:
 *   npx tsx scripts/smoke-pilot-suite.ts [auth|outbox|eto|tenant|js|all|pipeline]
 *
 * package.json:
 *   smoke:pilot:auth | :outbox | :eto | :tenant | :js | smoke:pilot | pipeline:pilot
 *
 * Env:
 *   REQUIRE_LIVE=1 — fail if live probes cannot run (forwarded to children)
 *   SKIP_JS=1      — skip JetStream group in all/pipeline
 *   GATEWAY_URL, NATS_URL, … — forwarded as-is to child smokes
 *
 * Groups map to existing scripts only (no theater contracts):
 *   auth   → smoke-auth-401, smoke-rbac-eto
 *   outbox → smoke-outbox-inv-proc, smoke-outbox-fin-mes
 *   eto    → smoke-saga-compensation
 *   tenant → smoke-tenant-isolation
 *   js     → smoke-jetstream-eto
 *   all    → auth + outbox + eto + tenant + js (unless SKIP_JS)
 *   pipeline → static ci-pilot-auth-env + compose inventory probe + all
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const REQUIRE_LIVE =
  process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE === 'true';
const SKIP_JS = process.env.SKIP_JS === '1' || process.env.SKIP_JS === 'true';

type Step = {
  name: string;
  cmd: string;
  args: string[];
  /** When true, non-zero exit is recorded but does not fail the suite unless REQUIRE_LIVE */
  soft?: boolean;
};

const GROUPS: Record<string, Step[]> = {
  auth: [
    {
      name: 'smoke-auth-401',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-auth-401.ts'],
    },
    {
      name: 'smoke-rbac-eto',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-rbac-eto.ts'],
    },
  ],
  outbox: [
    {
      name: 'smoke-outbox-inv-proc',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-outbox-inv-proc.ts'],
    },
    {
      name: 'smoke-outbox-fin-mes',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-outbox-fin-mes.ts'],
    },
  ],
  eto: [
    {
      name: 'smoke-saga-compensation',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-saga-compensation.ts'],
    },
  ],
  tenant: [
    {
      name: 'smoke-tenant-isolation',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-tenant-isolation.ts'],
    },
  ],
  js: [
    {
      name: 'smoke-jetstream-eto',
      cmd: 'npx',
      args: ['tsx', 'scripts/smoke-jetstream-eto.ts'],
    },
  ],
};

const ORDER = ['auth', 'outbox', 'eto', 'tenant', 'js'] as const;

function header(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

function runStep(step: Step): { name: string; ok: boolean; code: number; soft: boolean } {
  console.log(`\n>>> ${step.name}`);
  console.log(`    $ ${step.cmd} ${step.args.join(' ')}\n`);

  const r = spawnSync(step.cmd, step.args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const code = r.status ?? (r.error ? 1 : 0);
  const ok = code === 0;
  if (!ok) {
    console.log(`\n<<< ${step.name} FAILED (exit ${code})${step.soft ? ' [soft]' : ''}`);
  } else {
    console.log(`\n<<< ${step.name} OK`);
  }
  return { name: step.name, ok, code, soft: !!step.soft };
}

function stepsFor(group: string): Step[] {
  if (group === 'all') {
    const steps: Step[] = [];
    for (const g of ORDER) {
      if (g === 'js' && SKIP_JS) {
        console.log('SKIP_JS=1 — omitting jetstream group');
        continue;
      }
      steps.push(...GROUPS[g]);
    }
    return steps;
  }
  if (group === 'pipeline') {
    const steps: Step[] = [
      {
        name: 'ci-pilot-auth-env',
        cmd: 'bash',
        args: ['scripts/ci-pilot-auth-env.sh'],
      },
      {
        name: 'compose-pilot-inventory',
        cmd: 'bash',
        args: ['-c', composeInventorySnippet()],
        soft: !REQUIRE_LIVE,
      },
    ];
    for (const g of ORDER) {
      if (g === 'js' && SKIP_JS) continue;
      steps.push(...GROUPS[g]);
    }
    // DR dry-run is non-blocking unless REQUIRE_LIVE (live drill not required for pilot gate)
    if (existsSync(join(ROOT, 'scripts/dr-drill.sh'))) {
      steps.push({
        name: 'dr-drill (dry-run)',
        cmd: 'bash',
        args: ['scripts/dr-drill.sh'],
        soft: true,
      });
    }
    return steps;
  }
  if (!GROUPS[group]) {
    console.error(
      `Unknown group "${group}". Use: auth | outbox | eto | tenant | js | all | pipeline`,
    );
    process.exit(2);
  }
  return GROUPS[group];
}

/** Probe §8 pilot minimum services; soft unless REQUIRE_LIVE. */
function composeInventorySnippet(): string {
  // Prefer docker compose profile pilot status; fall back to port probes.
  // Exit 0 when stack down unless REQUIRE_LIVE=1 (fail-closed).
  return `
set +e
cd "${ROOT}"
echo "--- Compose pilot inventory (§8 minimum: gateway, pm, inv, finance, nats, keycloak, dbs) ---"
if command -v docker >/dev/null 2>&1; then
  out=$(docker compose --profile pilot ps 2>/dev/null)
  if [ -n "$out" ]; then
    echo "$out" | head -40
    echo "✓ docker compose --profile pilot ps"
  else
    echo "○ docker compose pilot ps unavailable (compose/project may be down)"
  fi
else
  echo "○ docker CLI not in PATH"
fi
fail=0
tcp_probe() {
  name="$1"
  port="$2"
  if (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
    echo "✓ $name :$port tcp open"
    return 0
  fi
  echo "○ $name :$port tcp closed"
  fail=1
  return 1
}
tcp_probe gateway 4005
tcp_probe pm 4001
tcp_probe inv 4002
tcp_probe finance 4004
tcp_probe nats 4222
tcp_probe keycloak 8080
echo "--- inventory done (misses=$fail, REQUIRE_LIVE=\${REQUIRE_LIVE:-0}) ---"
if [ "\${REQUIRE_LIVE:-}" = "1" ] || [ "\${REQUIRE_LIVE:-}" = "true" ]; then
  if [ "$fail" -ne 0 ]; then
    echo "REQUIRE_LIVE=1 and pilot inventory incomplete"
    exit 1
  fi
fi
exit 0
`.trim();
}

function main() {
  const group = (process.argv[2] || 'all').toLowerCase();
  header(
    `Pilot smoke suite — group=${group} REQUIRE_LIVE=${REQUIRE_LIVE ? '1' : '0'} SKIP_JS=${SKIP_JS ? '1' : '0'}`,
  );

  const steps = stepsFor(group);
  if (steps.length === 0) {
    console.error('No steps to run');
    process.exit(2);
  }

  const results: { name: string; ok: boolean; code: number; soft: boolean }[] = [];
  for (const step of steps) {
    results.push(runStep(step));
  }

  header('Pilot suite summary');
  let hardFails = 0;
  let softFails = 0;
  for (const r of results) {
    const mark = r.ok ? '✓' : r.soft ? '○' : '✗';
    const tag = r.ok ? 'PASS' : r.soft ? 'SOFT-FAIL' : 'FAIL';
    console.log(`${mark} ${r.name} → ${tag} (exit ${r.code})`);
    if (!r.ok) {
      if (r.soft && !REQUIRE_LIVE) softFails++;
      else hardFails++;
    }
  }

  console.log('');
  if (hardFails > 0) {
    console.log(`=== Result: ${hardFails} FAIL (${softFails} soft) ===`);
    process.exit(1);
  }
  if (softFails > 0) {
    console.log(`=== Result: PASS with ${softFails} soft skip/fail (structure OK / live down) ===`);
    process.exit(0);
  }
  console.log('=== Result: PASS ===');
  process.exit(0);
}

main();
