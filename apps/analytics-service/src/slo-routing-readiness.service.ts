import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SloRoutingReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-slo-routing-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const routingPolicy = fs.existsSync(path.join(root, 'infra/alertmanager/routes/SLO-ROUTING.md'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-slo-routing-probe.ts'));
    const sloGrafanaAlerts = fs.existsSync(
      path.join(root, 'infra/grafana/provisioning/alerting/slo-error-budget.yaml'),
    );

    let sloPagerdutyRoute = false;
    let sloOpsgenieRoute = false;
    let sloBaseRoute = false;
    try {
      const am = fs.readFileSync(path.join(root, 'infra/alertmanager/alertmanager.yml'), 'utf8');
      sloBaseRoute = am.includes('domain: slo') && am.includes('erp-slo');
      sloPagerdutyRoute =
        am.includes('domain: slo') && am.includes('severity: critical') && am.includes('erp-pagerduty');
      sloOpsgenieRoute =
        am.includes('domain: slo') && am.includes('erp-opsgenie') && am.includes('erp-oncall-off-hours');
    } catch {
      sloPagerdutyRoute = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-slo-routing-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      routingPolicy &&
      probeScript &&
      sloGrafanaAlerts &&
      sloBaseRoute &&
      sloPagerdutyRoute &&
      sloOpsgenieRoute &&
      ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : routingPolicy ? 'partial' : 'down',
      domain: 'SLO_ROUTING',
      routingPolicy,
      probeScript,
      sloGrafanaAlerts,
      sloBaseRoute,
      sloPagerdutyRoute,
      sloOpsgenieRoute,
      ciGateIncludesProbe,
      ciSloRoutingEnv: process.env.CI_SLO_ROUTING === 'true',
      capabilities: ['SLO PagerDuty escalation', 'SLO Opsgenie off-hours', 'Critical burn routing'],
      checkedAt: new Date().toISOString(),
    };
  }
}
