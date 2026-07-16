import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class BiGrafanaController {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'infra/grafana/dashboards/bi-snapshot-metrics.json'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  /** W87 — Grafana dashboard JSON for BI snapshot metrics */
  @Get('bi/metrics/grafana/dashboard')
  dashboard() {
    const file = path.join(this.findRepoRoot(), 'infra/grafana/dashboards/bi-snapshot-metrics.json');
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  }
}
