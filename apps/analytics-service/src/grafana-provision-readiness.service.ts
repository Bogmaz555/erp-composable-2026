import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GrafanaProvisionReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'infra/prometheus/prometheus.yml'))) return dir;
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
    const promConfig = this.fileExists('infra/prometheus/prometheus.yml');
    const dashProvision = this.fileExists('infra/grafana/provisioning/dashboards/dashboard.yml');
    const dsProvision = this.fileExists('infra/grafana/provisioning/datasources/prometheus.yml');
    const ensureScript = this.fileExists('scripts/ensure-grafana-ready.sh');
    const probeScript = this.fileExists('scripts/ci-grafana-provision-probe.ts');

    let promScrapesBi = false;
    let composeHasGrafana = false;
    try {
      const prom = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/prometheus/prometheus.yml'),
        'utf8',
      );
      promScrapesBi =
        prom.includes('erp-analytics-bi') &&
        prom.includes('/bi/metrics/retention/prometheus');
    } catch {
      promScrapesBi = false;
    }

    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeHasGrafana =
        compose.includes('grafana:') &&
        compose.includes('prometheus:') &&
        compose.includes('observability');
    } catch {
      composeHasGrafana = false;
    }

    let grafanaLive = false;
    let prometheusLive = false;
    try {
      const g = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(4000) });
      grafanaLive = g.ok;
    } catch {
      grafanaLive = false;
    }
    try {
      const p = await fetch('http://127.0.0.1:9090/-/ready', { signal: AbortSignal.timeout(4000) });
      prometheusLive = p.ok;
    } catch {
      prometheusLive = false;
    }

    const profileComplete =
      promConfig && dashProvision && dsProvision && ensureScript && probeScript && promScrapesBi && composeHasGrafana;
    const ready = profileComplete;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : profileComplete ? 'partial' : 'down',
      domain: 'GRAFANA_PROVISION',
      promConfig,
      dashProvision,
      dsProvision,
      ensureScript,
      probeScript,
      promScrapesBi,
      composeHasGrafana,
      grafanaLive,
      prometheusLive,
      capabilities: ['Prometheus scrape', 'Grafana provisioning', 'BI dashboard auto-load'],
      checkedAt: new Date().toISOString(),
    };
  }
}
