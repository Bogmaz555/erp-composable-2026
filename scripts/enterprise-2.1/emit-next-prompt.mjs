#!/usr/bin/env node
/**
 * Emit docs/enterprise-2.1/NEXT_AGENT_PROMPT.md from STATUS + milestones.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const STATUS = join(ROOT, 'docs/ENTERPRISE-2.1-STATUS.md');
const MILESTONES = join(ROOT, 'docs/enterprise-2.1/milestones.json');
const OUT = join(ROOT, 'docs/enterprise-2.1/NEXT_AGENT_PROMPT.md');

function statusField(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}
function extractStatusBlock(text) {
  const m = text.match(/```([\s\S]*?)```/);
  return m ? m[1] : text;
}

const statusText = readFileSync(STATUS, 'utf8');
const block = extractStatusBlock(statusText);
const milestoneId = statusField(block, 'milestone') || 'P0';
const phase = statusField(block, 'phase') || 'DESIGN';
const tenancy = statusField(block, 'tenancy') || 'DEDICATED_STACK';
const state = statusField(block, 'state') || 'READY';
const sha = statusField(block, 'sha') || 'unknown';

const ms = JSON.parse(readFileSync(MILESTONES, 'utf8'));
const m = ms.milestones.find((x) => x.id === milestoneId) || ms.milestones[0];
const work = (m.workstreams || []).map((w) => `- ${w}`).join('\n');
const gates = (m.gate_commands || []).map((g) => `  - \`${g}\``).join('\n');

let body = '';
if (state === 'DONE' || milestoneId === 'DONE') {
  body = `# Enterprise 2.1 — DONE\n\nProgram complete. Tag ${ms.target_tag}. No further agent work unless STATUS reset.\n`;
} else if (phase === 'DESIGN') {
  body = `# AGENT MISSION — ${m.id} DESIGN (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Baseline: ${ms.baseline_tag}
Branch: \`${m.branch}\` (create from master if missing)
Tenancy: **${tenancy}**

## Identity
Principal Architect. Full autonomy. No confirmation pauses.

## Task
Produce design at **\`${m.design_doc}\`** for **${m.id}: ${m.name}**.

### Workstreams
${work}

### Rules
- Key Decisions, Alternatives, Security, risks, **## PR Plan** with \`### PR N: Title\`
- Non-negotiables: ADR-008 + docs/ENTERPRISE-2.1-PLAN.md
- Do **not** reset Enterprise 2.0 STATUS (stays DONE)
- After design: STATUS phase=IMPLEMENT, commit, push
- Forbidden: readiness theater, Faza 29+, secrets in git

START NOW.
`;
} else if (phase === 'IMPLEMENT') {
  body = `# AGENT MISSION — ${m.id} IMPLEMENT (autonomous)

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Design: \`${m.design_doc}\`
Branch: \`${m.branch}\`

## Task
1. Read ${m.design_doc} ## PR Plan
2. Implement in dependency order on \`${m.branch}\`
3. When complete: STATUS phase=GATE, commit, push
4. Prefer: \`bash scripts/enterprise-2.1/gate-check.sh ${m.id}\`

### Workstreams
${work}

### Gates next
${gates}

START NOW.
`;
} else if (phase === 'GATE') {
  body = `# AGENT MISSION — ${m.id} GATE (autonomous)

## Task
1. \`bash scripts/enterprise-2.1/gate-check.sh ${m.id}\`
2. Fix up to 3 times or STATUS BLOCKED
3. On pass: STATUS phase=RELEASE, commit, push

START NOW.
`;
} else if (phase === 'RELEASE') {
  body = `# AGENT MISSION — ${m.id} RELEASE (autonomous)

Branch: \`${m.branch}\`
Tag: **${m.tag}**

## Task
1. \`gh pr create --base master --head ${m.branch}\` (or update)
2. Merge when green
3. Tag \`${m.tag}\`; push tag
4. Advance STATUS (next DESIGN or DONE if P5)
5. Commit STATUS; push

START NOW.
`;
} else {
  body = `# Unknown phase ${phase}\n\nFix STATUS phase to DESIGN|IMPLEMENT|GATE|RELEASE.\n`;
}

const contract = `
## Autonomy contract
- ZERO confirmation pauses
- Read docs/enterprise-2.1/AGENT_CONTRACT.md
- After work: advance STATUS; commit; push; \`pnpm run enterprise21:step\`
- Forbidden: force-push master, filter-repo without APPROVED_BY_USER_A, secrets in git
`;

const header = `<!-- generated ${new Date().toISOString()} milestone=${milestoneId} phase=${phase} sha=${sha} -->
<!-- Enterprise 2.1 — paste into Grok or /workflow -->

`;

writeFileSync(OUT, header + body.trimEnd() + '\n' + contract);
console.log(`Wrote ${OUT}`);
console.log(`milestone=${milestoneId} phase=${phase}`);
