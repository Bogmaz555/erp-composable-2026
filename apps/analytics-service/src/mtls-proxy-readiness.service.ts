import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MtlsProxyReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-mtls-proxy-probe.ts'))) return dir;
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
    const probeScript = this.fileExists('scripts/ci-mtls-proxy-probe.ts');
    const mtlsListen = this.fileExists('apps/api-gateway/src/mtls-listen.ts');
    const envExample = this.fileExists('infra/gateway/mtls.env.example');

    let proxyHook = false;
    try {
      const src = fs.readFileSync(
        path.join(this.findRepoRoot(), 'apps/api-gateway/src/mtls-listen.ts'),
        'utf8',
      );
      proxyHook =
        src.includes('startMtlsProxySidecar') &&
        src.includes('GATEWAY_MTLS_PROXY') &&
        src.includes('4446');
    } catch {
      proxyHook = false;
    }

    let envDocumentsProxy = false;
    try {
      const env = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/gateway/mtls.env.example'),
        'utf8',
      );
      envDocumentsProxy = env.includes('GATEWAY_MTLS_PROXY');
    } catch {
      envDocumentsProxy = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-mtls-proxy-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        wf.includes('ci-mtls-proxy-probe') && wf.includes('CI_MTLS_PROXY');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      probeScript && mtlsListen && envExample && proxyHook && envDocumentsProxy && ciGateIncludesProbe && workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'MTLS_PROXY',
      ciMtlsProxyEnv: process.env.CI_MTLS_PROXY === 'true',
      probeScript,
      proxyHook,
      envDocumentsProxy,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Full mTLS reverse proxy', 'HTTPS :4446 → HTTP :4005', 'prod-security ext'],
      checkedAt: new Date().toISOString(),
    };
  }
}
