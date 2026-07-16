import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AlertOncallReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-alert-oncall-probe.ts'))) return dir;
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
    const oncallConfig = this.fileExists('infra/alertmanager/time_intervals/oncall.yml');
    const probeScript = this.fileExists('scripts/ci-alert-oncall-probe.ts');

    let alertmanagerIntervals = false;
    try {
      const am = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/alertmanager/alertmanager.yml'),
        'utf8',
      );
      alertmanagerIntervals =
        am.includes('time_intervals:') &&
        am.includes('erp-oncall-business-hours') &&
        am.includes('active_time_intervals');
    } catch {
      alertmanagerIntervals = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-alert-oncall-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready = oncallConfig && probeScript && alertmanagerIntervals && ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : oncallConfig ? 'partial' : 'down',
      domain: 'ALERT_ONCALL',
      oncallConfig,
      probeScript,
      alertmanagerIntervals,
      ciGateIncludesProbe,
      ciAlertOncallEnv: process.env.CI_ALERT_ONCALL === 'true',
      capabilities: ['On-call rotation', 'time_intervals', 'PagerDuty/Opsgenie routing'],
      checkedAt: new Date().toISOString(),
    };
  }
}
