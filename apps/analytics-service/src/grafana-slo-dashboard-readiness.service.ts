import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GrafanaSloDashboardReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-grafana-slo-dashboard-probe.ts'))) return dir;
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
    const dashPath = path.join(this.findRepoRoot(), 'infra/grafana/dashboards/slo-error-budget.json');
    const probeScript = this.fileExists('scripts/ci-grafana-slo-dashboard-probe.ts');
    const sloAlerts = this.fileExists('infra/prometheus/alerts/slo-burn-rate.yml');
    const dashProvision = this.fileExists('infra/grafana/provisioning/dashboards/dashboard.yml');

    let dashboardFile = false;
    let coversErrorBudget = false;
    try {
      const raw = fs.readFileSync(dashPath, 'utf8');
      dashboardFile = true;
      coversErrorBudget =
        raw.includes('erp-slo-error-budget') &&
        raw.includes('erp_bi_snapshot_total') &&
        raw.includes('fast_burn') &&
        raw.includes('slow_burn');
    } catch {
      dashboardFile = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-grafana-slo-dashboard-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      dashboardFile && coversErrorBudget && probeScript && sloAlerts && dashProvision && ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : dashboardFile ? 'partial' : 'down',
      domain: 'GRAFANA_SLO_DASHBOARD',
      dashboardFile,
      coversErrorBudget,
      probeScript,
      sloAlerts,
      dashProvision,
      ciGateIncludesProbe,
      ciGrafanaSloDashboardEnv: process.env.CI_GRAFANA_SLO_DASHBOARD === 'true',
      dashboardPath: 'infra/grafana/dashboards/slo-error-budget.json',
      capabilities: ['SLO error budget gauge', 'Fast/slow burn panels', 'Prometheus SLO alerts link'],
      checkedAt: new Date().toISOString(),
    };
  }
}
