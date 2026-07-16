import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightCrossChainReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-playwright-cross-chain-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const chainSpec = fs.existsSync(path.join(root, 'e2e/pm-finance-tax-chain.spec.ts'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-cross-chain-probe.ts'));
    const bootScript = fs.existsSync(path.join(root, 'scripts/ci-playwright-stack-boot.sh'));

    let workflowChainJob = false;
    let workflowNoContinueOnError = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowChainJob = workflow.includes('playwright-cross-chain');
      const block = workflow.split('playwright-cross-chain:')[1]?.split('\n  playwright:')[0] ?? '';
      workflowNoContinueOnError = workflowChainJob && !block.includes('continue-on-error: true');
    } catch {
      workflowChainJob = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-playwright-cross-chain-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      chainSpec && probeScript && bootScript && workflowChainJob && workflowNoContinueOnError && ciGateIncludesProbe;

    return {
      ready,
      td012: ready ? 'yellow-minimum' : chainSpec ? 'partial' : 'down',
      domain: 'PLAYWRIGHT_CROSS_CHAIN',
      chainSpec,
      probeScript,
      bootScript,
      workflowChainJob,
      workflowNoContinueOnError,
      ciGateIncludesProbe,
      ciPlaywrightCrossChainEnv: process.env.CI_PLAYWRIGHT_CROSS_CHAIN === 'true',
      capabilities: ['PM → Finance → Tax cross-module E2E chain'],
      checkedAt: new Date().toISOString(),
    };
  }
}
