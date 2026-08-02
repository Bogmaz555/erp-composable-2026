#!/usr/bin/env node
/**
 * Set one or more STATUS fields: node status-set.mjs key=value key2=value2
 * Also: node status-set.mjs --log "message"
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const STATUS = join(ROOT, 'docs/ENTERPRISE-2.0-STATUS.md');

const args = process.argv.slice(2);
const logMsg = args.find((a) => a === '--log')
  ? args[args.indexOf('--log') + 1]
  : null;
const pairs = args.filter((a) => a.includes('=') && !a.startsWith('--'));

function extractBlock(text) {
  const m = text.match(/```([\s\S]*?)```/);
  return m ? m[1] : '';
}
function setField(block, key, val) {
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(block)) return block.replace(re, `${key}: ${val}`);
  return block + `\n${key}: ${val}`;
}

let text = readFileSync(STATUS, 'utf8');
let block = extractBlock(text);
const now = new Date().toISOString();
block = setField(block, 'updated', now);

try {
  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  block = setField(block, 'sha', sha);
} catch {
  /* ignore */
}

for (const p of pairs) {
  const i = p.indexOf('=');
  const k = p.slice(0, i);
  const v = p.slice(i + 1);
  block = setField(block, k, v);
}

text = text.replace(/```[\s\S]*?```/, '```\n' + block.trim() + '\n```');
if (logMsg) {
  if (!text.includes('## Session log')) {
    text += '\n## Session log\n\n| Time | Event |\n|------|-------|\n';
  }
  text += `\n| ${now} | ${logMsg} |`;
}
writeFileSync(STATUS, text);
console.log(`STATUS updated: ${pairs.join(' ') || '(log only)'}`);
