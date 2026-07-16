import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AlertEscalationReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-alert-escalation-probe.ts'))) return dir;
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
    const pagerdutyTemplate = this.fileExists('infra/alertmanager/templates/pagerduty.tmpl');
    const opsgenieTemplate = this.fileExists('infra/alertmanager/templates/opsgenie.tmpl');
    const probeScript = this.fileExists('scripts/ci-alert-escalation-probe.ts');

    let alertmanagerEscalation = false;
    try {
      const am = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/alertmanager/alertmanager.yml'),
        'utf8',
      );
      alertmanagerEscalation =
        am.includes('pagerduty_configs') &&
        am.includes('opsgenie_configs') &&
        am.includes('erp-pagerduty');
    } catch {
      alertmanagerEscalation = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-alert-escalation-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      pagerdutyTemplate && opsgenieTemplate && probeScript && alertmanagerEscalation && ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : pagerdutyTemplate ? 'partial' : 'down',
      domain: 'ALERT_ESCALATION',
      pagerdutyTemplate,
      opsgenieTemplate,
      probeScript,
      alertmanagerEscalation,
      ciGateIncludesProbe,
      ciAlertEscalationEnv: process.env.CI_ALERT_ESCALATION === 'true',
      capabilities: ['PagerDuty integration', 'Opsgenie integration', 'critical escalation route'],
      checkedAt: new Date().toISOString(),
    };
  }
}
