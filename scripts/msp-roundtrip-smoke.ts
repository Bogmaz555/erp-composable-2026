/**
 * MSP XML round-trip smoke — import fixture → export → verify tasks + links
 * Run: npx tsx scripts/msp-roundtrip-smoke.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const FIXTURE = path.join(__dirname, '../fixtures/sample-msp-project.xml');

function countTag(xml: string, tag: string): number {
  return (xml.match(new RegExp(`<${tag}>`, 'gi')) || []).length;
}

async function run() {
  console.log('=== MSP Round-Trip Smoke ===\n');
  let fails = 0;

  const pmRes = await fetch(`${GW}/api/pm`, { signal: AbortSignal.timeout(8000) });
  if (!pmRes.ok) {
    console.log('✗ PM list unavailable');
    process.exit(1);
  }
  let projects = await pmRes.json();
  if (!Array.isArray(projects) || projects.length === 0) {
    await fetch(`${GW}/api/pm/seed-ccpm`, { method: 'POST', signal: AbortSignal.timeout(10000) }).catch(() => null);
    const retry = await fetch(`${GW}/api/pm`, { signal: AbortSignal.timeout(8000) });
    projects = retry.ok ? await retry.json() : [];
  }
  const projectId = projects[0]?.id;
  if (!projectId) {
    console.log('✗ No PM project (seed-ccpm failed)');
    process.exit(1);
  }

  const xml = fs.readFileSync(FIXTURE, 'utf8');
  const importRes = await fetch(`${GW}/api/pm/projects/${projectId}/schedule/import-xml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml }),
    signal: AbortSignal.timeout(15000),
  });
  if (!importRes.ok) {
    console.log(`✗ Import failed ${importRes.status}`);
    fails++;
  } else {
    const imp = await importRes.json();
    console.log(`✓ Import: parsed=${imp.parsed} deps=${imp.dependenciesCreated ?? 0}`);
  }

  const exportRes = await fetch(`${GW}/api/pm/projects/${projectId}/schedule/export-xml`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!exportRes.ok) {
    console.log(`✗ Export failed ${exportRes.status}`);
    fails++;
    process.exit(1);
  }
  const exp = await exportRes.json();
  const outXml: string = exp.xml || '';

  const inTasks = countTag(xml, 'Task');
  const outTasks = countTag(outXml, 'Task');
  const inLinks = countTag(xml, 'PredecessorLink');
  const outLinks = countTag(outXml, 'PredecessorLink');

  console.log(`✓ Export tasks: in=${inTasks} out=${outTasks}`);
  console.log(`${outTasks >= inTasks ? '✓' : '✗'} Task count preserved`);
  if (outTasks < inTasks) fails++;

  console.log(`✓ Export links: in=${inLinks} out=${outLinks}`);
  console.log(`${outLinks >= inLinks ? '✓' : '✗'} PredecessorLink preserved`);
  if (outLinks < inLinks) fails++;

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

run();
