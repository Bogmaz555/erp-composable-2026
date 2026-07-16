import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MtlsGatewayReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-mtls-gateway-probe.ts'))) return dir;
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
    const probeScript = this.fileExists('scripts/ci-mtls-gateway-probe.ts');
    const ensureScript = this.fileExists('scripts/ensure-mtls-gateway-ready.sh');
    const mtlsGenScript = this.fileExists('scripts/generate-mtls-certs.sh');
    const envExample = this.fileExists('infra/gateway/mtls.env.example');
    const gatewayMtlsHook = this.fileExists('apps/api-gateway/src/mtls-listen.ts');

    let composeProdSecurity = false;
    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeProdSecurity = compose.includes('prod-security');
    } catch {
      composeProdSecurity = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-mtls-gateway-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        wf.includes('ci-mtls-gateway-probe') && wf.includes('CI_MTLS_GATEWAY');
    } catch {
      workflowIncludesProbe = false;
    }

    const mtlsCertsPresent =
      this.fileExists('infra/tls/mtls/server.crt') ||
      this.fileExists('infra/tls/mtls/.gitkeep');

    const ready =
      probeScript &&
      ensureScript &&
      mtlsGenScript &&
      envExample &&
      gatewayMtlsHook &&
      composeProdSecurity &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'MTLS_GATEWAY',
      ciMtlsGatewayEnv: process.env.CI_MTLS_GATEWAY === 'true',
      probeScript,
      ensureScript,
      mtlsGenScript,
      envExample,
      gatewayMtlsHook,
      composeProdSecurity,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      mtlsCertsPresent,
      capabilities: ['mTLS dev certs', 'Gateway HTTPS :4445', 'prod-security profile'],
      checkedAt: new Date().toISOString(),
    };
  }
}
