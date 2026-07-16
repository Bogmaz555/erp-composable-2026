/**
 * TD-010 — audit NestJS versions across apps/* package.json
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const APPS = path.join(ROOT, 'apps');
const CANON = path.join(ROOT, 'infra', 'nestjs-version-canonical.json');

const TRACK = [
  '@nestjs/common',
  '@nestjs/core',
  '@nestjs/cqrs',
  '@nestjs/microservices',
  '@nestjs/platform-fastify',
];

interface AppReport {
  app: string;
  versions: Record<string, string | undefined>;
  drift: string[];
}

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function audit(): {
  canonical: string;
  unified: boolean;
  td010: string;
  apps: AppReport[];
  driftCount: number;
} {
  const canon = readJson(CANON);
  const targetMajor = '11';
  const apps: AppReport[] = [];

  for (const dir of fs.readdirSync(APPS)) {
    const pkgPath = path.join(APPS, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = readJson(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const versions: Record<string, string | undefined> = {};
    const drift: string[] = [];
    for (const name of TRACK) {
      const v = deps[name];
      if (v) versions[name] = v;
      if (v && !v.includes(targetMajor)) {
        drift.push(`${name}=${v}`);
      }
    }
    if (Object.keys(versions).length) {
      apps.push({ app: dir, versions, drift });
    }
  }

  const driftCount = apps.reduce((n, a) => n + a.drift.length, 0);
  return {
    canonical: canon.canonical,
    unified: driftCount === 0,
    td010: driftCount === 0 ? 'yellow-minimum' : 'partial',
    apps,
    driftCount,
  };
}

const report = audit();
console.log(JSON.stringify(report, null, 2));
process.exit(report.unified ? 0 : 1);
