import { Controller, Get, Header } from '@nestjs/common';
import { Public } from './auth/public.decorator';

/** Enterprise Q4 — static MDM SoR map (docs/MDM-SOR-MAP.md). Requires auth via global guard. */
const MDM_SOR = {
  version: 'enterprise-0.5',
  entities: [
    { entity: 'ProductItem', sor: 'plm-service', id: 'itemId' },
    { entity: 'BusinessPartner', sor: 'crm-service', id: 'partnerId' },
    { entity: 'Project', sor: 'pm-service', id: 'projectId' },
    { entity: 'StockReservation', sor: 'inv-service', id: 'reservationId' },
    { entity: 'WorkOrder', sor: 'mes-service', id: 'workOrderId' },
    { entity: 'JournalEntry', sor: 'finance', id: 'journalEntryId' },
    { entity: 'NcrCapa', sor: 'quality-service', id: 'ncrId' },
    { entity: 'Document', sor: 'dms', id: 'documentId' },
  ],
  rules: ['no dual-write of SoR fields', 'cross-service updates via JetStream only'],
};

@Controller('api')
export class AppController {
  /** Public liveness — must stay reachable without bearer (pilot/k8s probes). */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Enterprise 2.1 P1 — minimal Prometheus text metrics (public for scrape).
   * Full RED metrics remain residual; erp_up is enough for availability alerts.
   */
  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): string {
    const lines = [
      '# HELP erp_up 1 if process is serving',
      '# TYPE erp_up gauge',
      'erp_up{service="api-gateway"} 1',
      `# HELP erp_build_info static build label`,
      `# TYPE erp_build_info gauge`,
      `erp_build_info{service="api-gateway",profile="${process.env.ENTERPRISE === '1' ? 'enterprise' : 'default'}"} 1`,
    ];
    return lines.join('\n') + '\n';
  }

  /** MDM SoR map — authenticated (not @Public). */
  @Get('mdm/sor')
  mdmSor() {
    return MDM_SOR;
  }
}
