import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SloBurnRateReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-slo-burn-rate-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private fileExists(rel: string) {
    return fs.existsSync(path.join(this.findRepoRoot(), rel));
  }

  async getReadiness() {
    const sloAlerts = this.fileExists('infra/prometheus/alerts/slo-burn-rate.yml');
    const probeScript = this.fileExists('scripts/ci-slo-burn-rate-probe.ts');

    let multiWindowRules = false;
    try {
      const rules = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/prometheus/alerts/slo-burn-rate.yml'),
        'utf8',
      );
      multiWindowRules =
        rules.includes('SloBurnRateFast') &&
        rules.includes('SloBurnRateSlow') &&
        rules.includes('[5m]') &&
        rules.includes('[1h]') &&
        rules.includes('[6h]');
    } catch {
      multiWindowRules = false;
    }

    let promLoadsSlo = false;
    try {
      const prom = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/prometheus/prometheus.yml'),
        'utf8',
      );
      promLoadsSlo = prom.includes('rule_files') && prom.includes('/etc/prometheus/alerts');
    } catch {
      promLoadsSlo = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-slo-burn-rate-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready = sloAlerts && probeScript && multiWindowRules && promLoadsSlo && ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : sloAlerts ? 'partial' : 'down',
      domain: 'SLO_BURN_RATE',
      sloAlerts,
      probeScript,
      multiWindowRules,
      promLoadsSlo,
      ciGateIncludesProbe,
      ciSloBurnRateEnv: process.env.CI_SLO_BURN_RATE === 'true',
      capabilities: ['Multi-window burn rate', 'Fast 5m/1h', 'Slow 1h/6h SLO alerts'],
      checkedAt: new Date().toISOString(),
    };
  }
}
