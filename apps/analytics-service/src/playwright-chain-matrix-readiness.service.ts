import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightChainMatrixReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-chain-matrix-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const matrixSpec = fs.existsSync(path.join(root, 'e2e/all-cross-chains-matrix.spec.ts'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-chain-matrix-probe.ts'));
    const bootScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-stack-boot.sh'));

    const chainSpecs = [
      'e2e/pm-finance-tax-chain.spec.ts',
      'e2e/proc-inv-quality-chain.spec.ts',
      'e2e/mes-eam-crm-chain.spec.ts',
      'e2e/hr-plm-pm-chain.spec.ts',
    ].every((f) => fs.existsSync(path.join(root, f)));

    let workflowMatrixJob = false;
    let workflowNoContinueOnError = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowMatrixJob = workflow.includes('playwright-all-chains-matrix');
      const block = workflow.split('playwright-all-chains-matrix:')[1]?.split('\n  playwright:')[0] ?? '';
      workflowNoContinueOnError = workflowMatrixJob && !block.includes('continue-on-error: true');
    } catch {
      workflowMatrixJob = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-chain-matrix-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      matrixSpec &&
      chainSpecs &&
      probeScript &&
      bootScript &&
      workflowMatrixJob &&
      workflowNoContinueOnError &&
      ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : matrixSpec ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_CHAIN_MATRIX',
      matrixSpec,
      chainSpecs,
      probeScript,
      bootScript,
      workflowMatrixJob,
      workflowNoContinueOnError,
      ciGateIncludesProbe,
      ciPlaywrightChainMatrixEnv: process.env.CI_PLAYWRIGHT_CHAIN_MATRIX === 'true',
      capabilities: ['All 4 cross-module chains', 'Full module matrix E2E'],
      checkedAt: new Date().toISOString(),
    };
  }
}
