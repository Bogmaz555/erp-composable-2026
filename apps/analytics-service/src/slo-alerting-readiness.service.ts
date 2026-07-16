import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SloAlertingReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-slo-alerting-probe.ts'))) return dir;
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
    const grafanaSloAlerts = this.fileExists('infra/grafana/provisioning/alerting/slo-error-budget.yaml');
    const grafanaContactPoints = this.fileExists('infra/grafana/provisioning/alerting/contact-points.yaml');
    const alertmanagerConfig = this.fileExists('infra/alertmanager/alertmanager.yml');
    const probeScript = this.fileExists('scripts/ci-slo-alerting-probe.ts');
    const sloPromAlerts = this.fileExists('infra/prometheus/alerts/slo-burn-rate.yml');

    let grafanaRulesCoverSlo = false;
    try {
      const rules = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/grafana/provisioning/alerting/slo-error-budget.yaml'),
        'utf8',
      );
      grafanaRulesCoverSlo =
        rules.includes('erp-slo-fast-burn') &&
        rules.includes('erp-slo-slow-burn') &&
        rules.includes('domain: slo');
    } catch {
      grafanaRulesCoverSlo = false;
    }

    let alertmanagerSloRoute = false;
    try {
      const am = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/alertmanager/alertmanager.yml'),
        'utf8',
      );
      alertmanagerSloRoute = am.includes('domain: slo') && am.includes('erp-slo');
    } catch {
      alertmanagerSloRoute = false;
    }

    let grafanaRoutesToAlertmanager = false;
    try {
      const cp = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/grafana/provisioning/alerting/contact-points.yaml'),
        'utf8',
      );
      grafanaRoutesToAlertmanager =
        cp.includes('prometheus-alertmanager') && cp.includes('alertmanager:9093');
    } catch {
      grafanaRoutesToAlertmanager = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-slo-alerting-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      grafanaSloAlerts &&
      grafanaContactPoints &&
      alertmanagerConfig &&
      probeScript &&
      sloPromAlerts &&
      grafanaRulesCoverSlo &&
      alertmanagerSloRoute &&
      grafanaRoutesToAlertmanager &&
      ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : grafanaSloAlerts ? 'partial' : 'down',
      domain: 'SLO_ALERTING',
      grafanaSloAlerts,
      grafanaContactPoints,
      alertmanagerConfig,
      probeScript,
      sloPromAlerts,
      grafanaRulesCoverSlo,
      alertmanagerSloRoute,
      grafanaRoutesToAlertmanager,
      ciGateIncludesProbe,
      ciSloAlertingEnv: process.env.CI_SLO_ALERTING === 'true',
      capabilities: ['Grafana SLO alerting', 'Alertmanager SLO routing', 'Error budget burn alerts'],
      checkedAt: new Date().toISOString(),
    };
  }
}
