import { Injectable } from '@nestjs/common';
import { CapaAggregateService } from './capa-aggregate.service';

/** W137 — NCR/CAPA production aggregate (ISO 9001 oriented) */
@Injectable()
export class NcrCapaProductionService {
  constructor(private readonly capa: CapaAggregateService) {}

  async production() {
    const agg = await this.capa.aggregate();
    const criticalOpen = (agg.ncrBySeverity?.CRITICAL ?? 0) + (agg.ncrBySeverity?.MAJOR ?? 0);
    const capaOnTrack =
      agg.openCapa === 0 || (agg.capaCoveragePct >= 80 && agg.openCapa <= agg.openNcr);

    return {
      source: 'quality-ncr-capa-production',
      ncrCount: agg.ncrCount,
      capaCount: agg.capaCount,
      openNcr: agg.openNcr,
      openCapa: agg.openCapa,
      capaCoveragePct: agg.capaCoveragePct,
      criticalOpenNcr: criticalOpen,
      iso9001Ready: agg.ncrCount === 0 || (agg.capaCoveragePct >= 50 && criticalOpen <= agg.openNcr),
      capaOnTrack,
      ncrByStatus: agg.ncrByStatus,
      capaByStatus: agg.capaByStatus,
      checkedAt: new Date().toISOString(),
    };
  }
}
