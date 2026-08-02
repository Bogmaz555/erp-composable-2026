#!/usr/bin/env node
/**
 * Emit docs/enterprise-2.0/NEXT_AGENT_PROMPT.md from STATUS + milestones.json
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const STATUS = join(ROOT, 'docs/ENTERPRISE-2.0-STATUS.md');
const MILESTONES = join(ROOT, 'docs/enterprise-2.0/milestones.json');
const OUT = join(ROOT, 'docs/enterprise-2.0/NEXT_AGENT_PROMPT.md');

function statusField(block, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function extractStatusBlock(text) {
  const m = text.match(/```([\s\S]*?)```/);
  return m ? m[1] : text;
}

const statusText = readFileSync(STATUS, 'utf8');
const block = extractStatusBlock(statusText);
const milestoneId = statusField(block, 'milestone') || 'Q0';
const phase = statusField(block, 'phase') || 'DESIGN';
const tenancy = statusField(block, 'tenancy') || 'DEDICATED_STACK';
const state = statusField(block, 'state') || 'READY';
const sha = statusField(block, 'sha') || 'unknown';

const ms = JSON.parse(readFileSync(MILESTONES, 'utf8'));
const m =
  ms.milestones.find((x) => x.id === milestoneId) || ms.milestones[0];

const work = (m.workstreams || []).map((w) => `- ${w}`).join('\n');
const gates = (m.gate_commands || []).map((g) => `  - \`${g}\``).join('\n');

let body = '';

if (state === 'DONE' || milestoneId === 'DONE') {
  body = `# Enterprise 2.0 — DONE

Program complete. Tag ${ms.target_tag}. No further agent work unless STATUS reset.
`;
} else if (phase === 'BOOTSTRAP' || phase === 'DESIGN') {
  body = `# AGENT MISSION — ${m.id} DESIGN (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Baseline: ${ms.baseline_tag} → current master
Branch: \`${m.branch}\` (create from master if missing)
Tenancy lock: **${tenancy}**

## Identity
Principal Architect. Full autonomy. No "should I continue?" questions.

## Task
Produce design document at **\`${m.design_doc}\`** for milestone **${m.id}: ${m.name}**.

### Workstreams
${work}

### Rules
- Include Key Decisions, Alternatives, Security, risks, **## PR Plan** with \`### PR N: Title\`, Dependencies, Files, Description
- No readiness theater / Faza 29+
- Non-negotiables: ADR-008 + docs/ENTERPRISE-2.0-PLAN.md
- After design file written: update docs/ENTERPRISE-2.0-STATUS.md phase=IMPLEMENT, commit, push branch \`enterprise-2.0-automation\` or \`${m.branch}\`
- Prefer also running: \`/design\` equivalent quality (self-review once)

### Forbidden
${(m.do_not || ['domain scope creep']).map((d) => `- ${d}`).join('\n')}

START NOW. Write the design file.
`;
} else if (phase === 'IMPLEMENT') {
  body = `# AGENT MISSION — ${m.id} IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: \`${m.design_doc}\` (must exist)
Branch: \`${m.branch}\`

## Identity
Principal Engineer. Full autonomy. Implement PR Plan from design.

## Task
1. Read ${m.design_doc} ## PR Plan
2. Implement PRs in dependency order on branch \`${m.branch}\`
3. Prefer: if design has PR Plan, you may use mental execute-plan loop (implement + self-review per PR)
4. Live fixes allowed; no domain scope outside workstreams
5. When implementation complete: set STATUS phase=GATE, commit, push
6. Run: \`bash scripts/enterprise-2.0/gate-check.sh ${m.id}\` if possible

### Workstreams
${work}

### Gates that must pass next
${gates}

START NOW. Implement.
`;
} else if (phase === 'GATE') {
  body = `# AGENT MISSION — ${m.id} GATE (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: \`${m.branch}\`

## Task
1. Run: \`bash scripts/enterprise-2.0/gate-check.sh ${m.id}\`
2. Also run live commands if stack available:
${gates}
3. If fail: fix (max 3 attempts), re-gate; if still fail STATUS state=BLOCKED with last_error
4. If pass: STATUS phase=RELEASE, commit, push

Boot stack if needed: \`bash scripts/boot-pilot-complete.sh\` (or enterprise boot when exists).

START NOW.
`;
} else if (phase === 'RELEASE') {
  body = `# AGENT MISSION — ${m.id} RELEASE (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: \`${m.branch}\`
Tag: **${m.tag}**

## Task
1. Ensure gates green
2. \`gh pr create --base master --head ${m.branch}\` (or update existing)
3. Merge when required CI green (admin OK if only optional red)
4. Tag \`${m.tag}\` on merge commit; push tag
5. Advance STATUS to next milestone DESIGN (or DONE if Q5)
6. Commit STATUS on master or automation branch; push

Milestone order: Q0→Q1→Q2→Q3→Q4→Q5→DONE

START NOW.
`;
} else {
  body = `# AGENT MISSION — unknown phase ${phase}

Read docs/ENTERPRISE-2.0-STATUS.md and fix phase to DESIGN|IMPLEMENT|GATE|RELEASE.
`;
}

const contract = `
## Autonomy contract (mandatory)
- ZERO confirmation pauses. Execute fully.
- Read also: docs/enterprise-2.0/AGENT_CONTRACT.md
- After work: update STATUS (or \`node scripts/enterprise-2.0/advance-phase.mjs success "reason"\`)
- Commit + push, then: \`pnpm run enterprise:step\`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git, readiness theater
`;

const header = `<!-- generated ${new Date().toISOString()} milestone=${milestoneId} phase=${phase} sha=${sha} -->
<!-- Unattended: paste into Grok OR run /workflow enterprise-20-step|continuous -->

`;

writeFileSync(OUT, header + body.trimEnd() + '\n' + contract);
console.log(`Wrote ${OUT}`);
console.log(`milestone=${milestoneId} phase=${phase}`);
