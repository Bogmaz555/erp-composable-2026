import { Injectable } from '@nestjs/common';

export interface EtoPayloadCoverageEntry {
  service: string;
  handler: string;
  eventOrRoute: string;
  guarded: boolean;
}

@Injectable()
export class EtoPayloadService {
  private readonly coverage: EtoPayloadCoverageEntry[] = [
    { service: 'pm-service', handler: 'plm-integration', eventOrRoute: 'plm.bom.released', guarded: true },
    { service: 'pm-service', handler: 'proc-integration', eventOrRoute: 'pm.material.requested', guarded: true },
    { service: 'inv-service', handler: 'pm-integration', eventOrRoute: 'inv.release / reservation', guarded: true },
    { service: 'mes-service', handler: 'record-production', eventOrRoute: 'mes.production.recorded.v1', guarded: true },
  ];

  getReadiness() {
    const guarded = this.coverage.filter((c) => c.guarded).length;
    const total = this.coverage.length;
    return {
      ready: guarded >= 3,
      td004: guarded >= 4 ? 'yellow-minimum' : guarded >= 2 ? 'partial' : 'down',
      guarded,
      total,
      coverage: this.coverage,
      requiredFields: ['projectId', 'wbsElementId|bomComponentId'],
      checkedAt: new Date().toISOString(),
    };
  }
}
