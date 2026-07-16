import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class K8sExtendedReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-k8s-extended-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/k8s/K8S-EXTENDED-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-k8s-extended-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-k8s-extended-probe.ts'));
    const kustomization = fs.existsSync(path.join(root, 'infra/k8s/deploy/kustomization.yaml'));

    const manifests = [
      'pm-service.yaml',
      'plm-service.yaml',
      'finance-service.yaml',
      'quality-service.yaml',
      'eam-service.yaml',
      'proc-service.yaml',
    ];
    const manifestChecks: Record<string, boolean> = {};
    for (const m of manifests) {
      manifestChecks[m] = fs.existsSync(path.join(root, 'infra/k8s/deploy', m));
    }
    const allManifests = Object.values(manifestChecks).every(Boolean);

    let kustomizationIncludesAll = false;
    try {
      const kust = fs.readFileSync(path.join(root, 'infra/k8s/deploy/kustomization.yaml'), 'utf8');
      kustomizationIncludesAll = manifests.every((m) => kust.includes(m.replace('.yaml', '')));
    } catch {
      kustomizationIncludesAll = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-k8s-extended-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesProbe = wf.includes('ci-k8s-extended-probe') && wf.includes('CI_K8S_EXTENDED');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      policy &&
      ensureScript &&
      probeScript &&
      kustomization &&
      allManifests &&
      kustomizationIncludesAll &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'K8S_EXTENDED',
      ciK8sExtendedEnv: process.env.CI_K8S_EXTENDED === 'true',
      policy,
      ensureScript,
      probeScript,
      kustomization,
      manifestChecks,
      kustomizationIncludesAll,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      serviceCount: manifests.length,
      capabilities: ['PM/PLM/Finance/Quality/EAM/Proc K8s manifests'],
      checkedAt: new Date().toISOString(),
    };
  }
}
