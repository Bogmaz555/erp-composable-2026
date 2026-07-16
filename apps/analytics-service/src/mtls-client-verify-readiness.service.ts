import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MtlsClientVerifyReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-mtls-client-verify-probe.ts'))) return dir;
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
    const probeScript = this.fileExists('scripts/ci-mtls-client-verify-probe.ts');
    const mtlsListen = this.fileExists('apps/api-gateway/src/mtls-listen.ts');
    const envExample = this.fileExists('infra/gateway/mtls.env.example');

    let clientVerifyHook = false;
    try {
      const src = fs.readFileSync(
        path.join(this.findRepoRoot(), 'apps/api-gateway/src/mtls-listen.ts'),
        'utf8',
      );
      clientVerifyHook =
        src.includes('GATEWAY_MTLS_CLIENT_VERIFY') &&
        src.includes('requestCert') &&
        src.includes('rejectUnauthorized');
    } catch {
      clientVerifyHook = false;
    }

    let envDocumentsVerify = false;
    try {
      const env = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/gateway/mtls.env.example'),
        'utf8',
      );
      envDocumentsVerify = env.includes('GATEWAY_MTLS_CLIENT_VERIFY');
    } catch {
      envDocumentsVerify = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-mtls-client-verify-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        wf.includes('ci-mtls-client-verify-probe') && wf.includes('CI_MTLS_CLIENT_VERIFY');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      probeScript &&
      mtlsListen &&
      envExample &&
      clientVerifyHook &&
      envDocumentsVerify &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'MTLS_CLIENT_VERIFY',
      ciMtlsClientVerifyEnv: process.env.CI_MTLS_CLIENT_VERIFY === 'true',
      probeScript,
      clientVerifyHook,
      envDocumentsVerify,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Client cert mTLS', 'requestCert + rejectUnauthorized', 'CA verification'],
      checkedAt: new Date().toISOString(),
    };
  }
}
