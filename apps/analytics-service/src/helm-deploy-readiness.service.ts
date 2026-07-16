import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class HelmDeployReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-helm-deploy-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/helm/HELM-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-helm-deploy-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-helm-deploy-probe.ts'));
    const chart = fs.existsSync(path.join(root, 'infra/helm/erp/Chart.yaml'));
    const valuesDev = fs.existsSync(path.join(root, 'infra/helm/erp/values-dev.yaml'));
    const valuesStaging = fs.existsSync(path.join(root, 'infra/helm/erp/values-staging.yaml'));
    const valuesProd = fs.existsSync(path.join(root, 'infra/helm/erp/values-prod.yaml'));
    const gatewayTpl = fs.existsSync(path.join(root, 'infra/helm/erp/templates/api-gateway.yaml'));

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-helm-deploy-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesProbe = wf.includes('ci-helm-deploy-probe') && wf.includes('CI_HELM_DEPLOY');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      policy &&
      ensureScript &&
      probeScript &&
      chart &&
      valuesDev &&
      valuesStaging &&
      valuesProd &&
      gatewayTpl &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'HELM_DEPLOY',
      ciHelmDeployEnv: process.env.CI_HELM_DEPLOY === 'true',
      policy,
      ensureScript,
      probeScript,
      chart,
      valuesDev,
      valuesStaging,
      valuesProd,
      gatewayTpl,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Helm chart', 'Values per environment', 'K8s templating'],
      checkedAt: new Date().toISOString(),
    };
  }
}
