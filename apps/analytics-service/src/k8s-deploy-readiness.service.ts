import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class K8sDeployReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-k8s-deploy-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/k8s/DEPLOY-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-k8s-deploy-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-k8s-deploy-probe.ts'));
    const kustomization = fs.existsSync(path.join(root, 'infra/k8s/deploy/kustomization.yaml'));
    const gateway = fs.existsSync(path.join(root, 'infra/k8s/deploy/api-gateway.yaml'));
    const analytics = fs.existsSync(path.join(root, 'infra/k8s/deploy/analytics-service.yaml'));

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-k8s-deploy-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesProbe = wf.includes('ci-k8s-deploy-probe') && wf.includes('CI_K8S_DEPLOY');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      policy && ensureScript && probeScript && kustomization && gateway && analytics && ciGateIncludesProbe && workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'K8S_DEPLOY',
      ciK8sDeployEnv: process.env.CI_K8S_DEPLOY === 'true',
      policy,
      ensureScript,
      probeScript,
      kustomization,
      gatewayManifest: gateway,
      analyticsManifest: analytics,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['K8s Deployment manifests', 'Kustomize', 'Health probes'],
      checkedAt: new Date().toISOString(),
    };
  }
}
