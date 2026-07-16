import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BiAlertsReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'infra/prometheus/alerts/bi-retention.yml'))) return dir;
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
    const promAlerts = this.fileExists('infra/prometheus/alerts/bi-retention.yml');
    const alertmanagerConfig = this.fileExists('infra/alertmanager/alertmanager.yml');
    const grafanaAlerts = this.fileExists('infra/grafana/provisioning/alerting/bi-retention.yaml');
    const probeScript = this.fileExists('scripts/ci-bi-alerts-probe.ts');

    let promWiring = false;
    let composeHasAlertmanager = false;
    try {
      const prom = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/prometheus/prometheus.yml'),
        'utf8',
      );
      promWiring = prom.includes('rule_files') && prom.includes('alertmanagers');
    } catch {
      promWiring = false;
    }

    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeHasAlertmanager = compose.includes('alertmanager:') && compose.includes('observability');
    } catch {
      composeHasAlertmanager = false;
    }

    let alertRulesCoverBi = false;
    try {
      const rules = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/prometheus/alerts/bi-retention.yml'),
        'utf8',
      );
      alertRulesCoverBi =
        rules.includes('erp_bi_snapshot_total') &&
        rules.includes('erp_bi_snapshot_purged_last') &&
        rules.includes('erp_bi_snapshot_ttl_hours');
    } catch {
      alertRulesCoverBi = false;
    }

    const ready =
      promAlerts && alertmanagerConfig && grafanaAlerts && probeScript && promWiring && composeHasAlertmanager && alertRulesCoverBi;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : promAlerts ? 'partial' : 'down',
      domain: 'BI_ALERTS',
      promAlerts,
      alertmanagerConfig,
      grafanaAlerts,
      probeScript,
      promWiring,
      composeHasAlertmanager,
      alertRulesCoverBi,
      ciBiAlertsEnv: process.env.CI_BI_ALERTS === 'true',
      capabilities: ['Prometheus alert rules', 'Alertmanager routing', 'Grafana unified alerting'],
      checkedAt: new Date().toISOString(),
    };
  }
}
