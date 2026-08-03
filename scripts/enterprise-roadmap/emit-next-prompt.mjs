#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const STATUS = join(ROOT, 'docs/ENTERPRISE-ROADMAP-STATUS.md');
const MILESTONES = join(ROOT, 'docs/enterprise-roadmap/milestones.json');
const OUT = join(ROOT, 'docs/enterprise-roadmap/NEXT_AGENT_PROMPT.md');

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
const milestoneId = statusField(block, 'milestone') || 'E0';
const phase = statusField(block, 'phase') || 'DESIGN';
const tenancy = statusField(block, 'tenancy') || 'DEDICATED_STACK';
const state = statusField(block, 'state') || 'READY';
const sha = statusField(block, 'sha') || 'unknown';
const ga = statusField(block, 'GA_LITE_SIGNED') || 'false';

const ms = JSON.parse(readFileSync(MILESTONES, 'utf8'));
const m = ms.milestones.find((x) => x.id === milestoneId) || ms.milestones[0];
const work = (m?.workstreams || []).map((w) => `- ${w}`).join('\n');
const gates = (m?.gate_commands || []).map((g) => `  - \`${g}\``).join('\n');
const now = new Date().toISOString();

let body = '';
if (state === 'DONE' || milestoneId === 'DONE') {
  body = `# Enterprise Roadmap — DONE

Program complete (or E4 deferred). Target ${ms.target_tag}.
No further agent work unless STATUS reset.

## Autonomy
- ZERO confirmation pauses
- Leave workspace on master after RESUME
`;
} else if (phase === 'DESIGN') {
  body = `# AGENT MISSION — ${m.id} DESIGN

Repo: /home/bogdan-mazur/PROGRAMY/ERP/erp-composable-2026
Branch: \`${m.branch}\` from master
Tenancy: **${tenancy}** · GA_LITE_SIGNED=${ga}

## Task
Write **\`${m.design_doc}\`** for **${m.id}: ${m.name}** with Key Decisions, risks, **## PR Plan** and \`### PR\` sections.

### Workstreams
${work}

After design: advance STATUS to IMPLEMENT, commit, push, \`pnpm run enterprise-roadmap:step\`.
Forbidden: reset 2.0/2.1 DONE, secrets, force-push master.
START NOW.
`;
} else if (phase === 'IMPLEMENT') {
  body = `# AGENT MISSION — ${m.id} IMPLEMENT

Design: \`${m.design_doc}\`
Branch: \`${m.branch}\`

1. Implement ## PR Plan
2. STATUS → GATE, commit, push
3. Gate commands:
${gates}

### Workstreams
${work}
START NOW.
`;
} else if (phase === 'GATE') {
  body = `# AGENT MISSION — ${m.id} GATE

Run: \`bash scripts/enterprise-roadmap/gate-check.sh ${m.id}\`
On pass: STATUS → RELEASE. On fail (2 attempts): BLOCKED + last_error.
START NOW.
`;
} else if (phase === 'RELEASE') {
  body = `# AGENT MISSION — ${m.id} RELEASE

1. PR merge to master (no force-push)
2. Tag \`${m.tag}\` if applicable
3. advance-phase success after RELEASE
4. push + enterprise-roadmap:step
START NOW.
`;
} else {
  body = `# AGENT MISSION — ${milestoneId}/${phase}\n\nRead STATUS. Continue.\n`;
}

const header = `<!-- generated ${now} milestone=${milestoneId} phase=${phase} sha=${sha} -->
<!-- Enterprise roadmap — paste into Grok or scheduler RESUME -->

`;
writeFileSync(OUT, header + body);
console.log(`Wrote ${OUT}\nmilestone=${milestoneId} phase=${phase}`);
