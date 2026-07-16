import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    const results = await this.platform.globalSearch(q || '');
    return { query: q, count: results.length, results };
  }

  @Get('kpi')
  async kpi() {
    return this.platform.getKpiDashboard();
  }

  @Get('audit')
  getAudit(
    @Query('take') take?: string,
    @Query('category') category?: string,
    @Query('service') service?: string,
    @Query('complianceOnly') complianceOnly?: string,
  ) {
    const entries = this.platform.getAudit({
      take: parseInt(take || '100', 10),
      category: category as 'compliance' | 'operational' | 'system' | undefined,
      service: service || undefined,
      complianceOnly: complianceOnly === 'true' || complianceOnly === '1',
    });
    return { entries, count: entries.length };
  }

  @Get('platform/audit/summary')
  auditSummary() {
    return this.platform.getAuditSummary();
  }

  @Get('platform/audit/readiness')
  auditReadiness() {
    return this.platform.getAuditReadiness();
  }

  @Get('platform/boot/readiness')
  async bootReadiness() {
    return this.platform.getBootReadiness();
  }

  @Get('platform/production/readiness')
  async productionReadiness() {
    return this.platform.getProductionReadiness();
  }

  @Get('notifications')
  getNotifications(@Query('take') take?: string) {
    return { items: this.platform.getNotifications(parseInt(take || '20', 10)) };
  }

  @Get('platform/nestjs-versions')
  nestjsVersions() {
    return this.platform.getNestjsVersions();
  }

  @Get('platform/observability/readiness')
  async observabilityReadiness() {
    return this.platform.getObservabilityReadiness();
  }

  @Get('export/:entity')
  async exportCsv(@Param('entity') entity: string) {
    const csv = await this.platform.exportCsv(entity);
    return { entity, csv, filename: `${entity}-export-${new Date().toISOString().slice(0, 10)}.csv` };
  }

  @Post('import/products/preview')
  previewImportProducts(@Body() body: { csv: string }) {
    return this.platform.previewProductImport(body.csv || '');
  }

  @Post('import/products')
  async importProducts(@Body() body: { csv: string }) {
    const { rows, errors: parseErrors } = this.platform.parseProductCsv(body.csv || '');
    if (rows.length === 0) return { imported: 0, errors: parseErrors.length ? parseErrors : ['Brak danych CSV'] };
    let imported = 0;
    const errors: string[] = [...parseErrors];

    for (const row of rows) {
      try {
        const res = await fetch('http://127.0.0.1:4007/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partNumber: row.partNumber,
            name: row.name,
            type: row.type || 'COMPONENT',
            category: row.category,
            standardCost: parseFloat(row.standardCost) || 0,
            currency: row.currency || 'PLN',
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) imported++;
        else errors.push(`${row.partNumber}: HTTP ${res.status}`);
      } catch (e) {
        errors.push(`${row.partNumber}: ${(e as Error).message}`);
      }
    }
    this.platform.recordEvent('platform.import.products', 'platform', { imported, errors: errors.length });
    return { imported, errors: errors.slice(0, 10) };
  }
}
