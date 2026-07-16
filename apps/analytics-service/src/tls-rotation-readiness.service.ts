import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TlsRotationReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-tls-rotation-probe.ts'))) return dir;
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
    const rotateScript = this.fileExists('scripts/rotate-tls-certs.sh');
    const ensureScript = this.fileExists('scripts/ensure-tls-rotation-ready.sh');
    const probeScript = this.fileExists('scripts/ci-tls-rotation-probe.ts');
    const policy = this.fileExists('infra/tls/rotation/ROTATION-POLICY.md');

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-tls-rotation-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe = wf.includes('ci-tls-rotation-probe') && wf.includes('CI_TLS_ROTATION');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      rotateScript && ensureScript && probeScript && policy && ciGateIncludesProbe && workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'TLS_ROTATION',
      ciTlsRotationEnv: process.env.CI_TLS_ROTATION === 'true',
      rotateScript,
      ensureScript,
      probeScript,
      rotationPolicy: policy,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['TLS cert rotation', 'mTLS + dev TLS', '90-day rotation policy'],
      checkedAt: new Date().toISOString(),
    };
  }
}
