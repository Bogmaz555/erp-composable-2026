#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const STATUS = join(ROOT, 'docs/ENTERPRISE-ROADMAP-STATUS.md');
const MILESTONES = join(ROOT, 'docs/enterprise-roadmap/milestones.json');

const result = process.argv[2] || 'success';
const message = process.argv.slice(3).join(' ') || '';

function extractBlock(text) {
  const m = text.match(/```([\s\S]*?)```/);
  return m ? m[1] : '';
}
function setField(block, key, val) {
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(block)) return block.replace(re, `${key}: ${val}`);
  return block + `\n${key}: ${val}`;
}
function getField(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}
function setChecklist(block, id, val) {
  const re = new RegExp(`(^checklist:[\\s\\S]*?^\\s{2}${id}:\\s*).*$`, 'm');
  if (re.test(block)) return block.replace(re, `$1${val}`);
  return block;
}

const order = ['DESIGN', 'IMPLEMENT', 'GATE', 'RELEASE'];
const ms = JSON.parse(readFileSync(MILESTONES, 'utf8'));
let text = readFileSync(STATUS, 'utf8');
let block = extractBlock(text);
const now = new Date().toISOString();
let phase = getField(block, 'phase') || 'DESIGN';
let milestone = getField(block, 'milestone') || 'E0';

if (result === 'fail') {
  block = setField(block, 'state', 'BLOCKED');
  block = setField(block, 'last_error', message || 'gate or step failed');
  block = setField(block, 'updated', now);
} else {
  const idx = order.indexOf(phase);
  if (phase === 'RELEASE' || idx === order.length - 1) {
    block = setChecklist(block, milestone, 'done');
    const ids = ms.milestones.map((m) => m.id);
    const mi = ids.indexOf(milestone);
    if (mi >= 0 && mi < ids.length - 1) {
      milestone = ids[mi + 1];
      phase = 'DESIGN';
      block = setField(block, 'state', 'READY');
    } else {
      milestone = 'DONE';
      phase = 'DONE';
      block = setField(block, 'state', 'DONE');
    }
  } else if (idx >= 0) {
    phase = order[idx + 1];
    block = setField(block, 'state', 'READY');
  } else {
    phase = 'DESIGN';
  }
  block = setField(block, 'last_error', 'none');
  block = setField(block, 'updated', now);
}

try {
  block = setField(block, 'sha', execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim());
} catch {
  /* ignore */
}

block = setField(block, 'phase', phase);
block = setField(block, 'milestone', milestone);
block = setField(
  block,
  'next_action',
  phase === 'DONE'
    ? 'none'
    : `Execute docs/enterprise-roadmap/NEXT_AGENT_PROMPT.md (${milestone}/${phase})`,
);

text = text.replace(/```[\s\S]*?```/, '```\n' + block.trim() + '\n```');
if (!text.includes('## Session log')) {
  text += '\n## Session log\n\n| Time | Event |\n|------|-------|\n';
}
text += `\n| ${now} | advance ${result}: ${milestone}/${phase} ${message} |`;
writeFileSync(STATUS, text);
console.log(`STATUS → milestone=${milestone} phase=${phase} state=${getField(block, 'state')}`);
