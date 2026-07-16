import { Controller, Get, Header } from '@nestjs/common';
import { BiRetentionMetricsService } from './bi-retention-metrics.service';

@Controller()
export class BiMetricsController {
  constructor(private readonly metrics: BiRetentionMetricsService) {}

  /** W83 — JSON retention metrics */
  @Get('bi/metrics/retention')
  retentionJson() {
    return this.metrics.getMetricsJson();
  }

  /** W83 — Prometheus text exposition */
  @Get('bi/metrics/retention/prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async retentionPrometheus() {
    return this.metrics.getPrometheusText();
  }
}
