import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QualityEamProdReadinessService {
  private readonly qualityBase = 'http://127.0.0.1:4008';
  private readonly eamBase = 'http://127.0.0.1:4009';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-quality-eam-prod-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private async probe(url: string) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { ok: res.ok, body };
    } catch {
      return { ok: false, body: undefined };
    }
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/quality/QUALITY-EAM-PROD-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-quality-eam-prod-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-quality-eam-prod-probe.ts'));
    const qualityProdCtrl = fs.existsSync(
      path.join(root, 'apps/quality-service/src/ncr-capa-production.controller.ts'),
    );
    const eamProdCtrl = fs.existsSync(path.join(root, 'apps/eam-service/src/eam-production.controller.ts'));

    const ncrCapaProd = await this.probe(`${this.qualityBase}/ncr-capa/production`);
    const eamProd = await this.probe(`${this.eamBase}/eam/production/status`);
    const qualityHealth = await this.probe(`${this.qualityBase}/health`);
    const eamHealth = await this.probe(`${this.eamBase}/health`);

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-quality-eam-prod-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const liveScore = [ncrCapaProd.ok, eamProd.ok, qualityHealth.ok, eamHealth.ok].filter(Boolean).length;
    const infraReady = policy && ensureScript && probeScript && qualityProdCtrl && eamProdCtrl && ciGateIncludesProbe;

    return {
      ready: infraReady && liveScore >= 2,
      td004: liveScore >= 3 ? 'yellow-minimum' : liveScore >= 2 ? 'partial' : 'down',
      domain: 'QUALITY_EAM_PROD',
      ciQualityEamProdEnv: process.env.CI_QUALITY_EAM_PROD === 'true',
      policy,
      ensureScript,
      probeScript,
      qualityProdCtrl,
      eamProdCtrl,
      ncrCapaProdUp: ncrCapaProd.ok,
      eamProdUp: eamProd.ok,
      qualityHealthUp: qualityHealth.ok,
      eamHealthUp: eamHealth.ok,
      ciGateIncludesProbe,
      capabilities: ['NCR/CAPA production aggregate', 'EAM production status', 'ISO 9001 readiness'],
      checkedAt: new Date().toISOString(),
    };
  }
}
