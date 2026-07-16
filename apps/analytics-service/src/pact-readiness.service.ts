import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RegistryEvent {
  name: string;
  status: 'Active' | 'Planned';
  domain: string;
}

@Injectable()
export class PactReadinessService {
  private readonly registryPath = path.join(process.cwd(), 'docs/EVENTS/REGISTRY.md');

  /** Canonical Active events per Event Registry (TD-012 lite) */
  private readonly activeEvents: RegistryEvent[] = [
    { name: 'crm.opportunity.accepted.v1', status: 'Active', domain: 'CRM' },
    { name: 'pm.material.requested.v1', status: 'Active', domain: 'PM' },
    { name: 'plm.bom.released.v2', status: 'Active', domain: 'PLM' },
    { name: 'mes.production.recorded.v1', status: 'Active', domain: 'MES' },
    { name: 'inv.stock.out.v1', status: 'Active', domain: 'INV' },
    { name: 'inventory.reservation.created.v1', status: 'Active', domain: 'INV' },
    { name: 'inventory.reservation.released.v1', status: 'Active', domain: 'INV' },
    { name: 'proc.purchaseorder.created.v1', status: 'Active', domain: 'PROC' },
    { name: 'proc.purchaseorder.approved.v1', status: 'Active', domain: 'PROC' },
    { name: 'proc.material.received.v1', status: 'Active', domain: 'PROC' },
    { name: 'finance.payment.milestone.reached.v1', status: 'Active', domain: 'FIN' },
    { name: 'finance.revenue.recognized.v1', status: 'Active', domain: 'FIN' },
    { name: 'quality.ncr.raised.v1', status: 'Active', domain: 'QUALITY' },
    { name: 'quality.ncr.closed.v1', status: 'Active', domain: 'QUALITY' },
    { name: 'quality.capa.created.v1', status: 'Active', domain: 'QUALITY' },
    { name: 'quality.capa.verified.v1', status: 'Active', domain: 'QUALITY' },
    { name: 'tax.invoice.ksef.sent.v1', status: 'Active', domain: 'TAX' },
    { name: 'eam.breakdown.detected.v1', status: 'Active', domain: 'EAM' },
  ];

  private registryFileExists(): boolean {
    const alt = path.join(process.cwd(), '..', '..', 'docs/EVENTS/REGISTRY.md');
    return fs.existsSync(this.registryPath) || fs.existsSync(alt);
  }

  getReadiness() {
    const active = this.activeEvents.filter((e) => e.status === 'Active');
    const byDomain = active.reduce<Record<string, number>>((acc, e) => {
      acc[e.domain] = (acc[e.domain] ?? 0) + 1;
      return acc;
    }, {});

    const registryOk = this.registryFileExists();
    const documented = active.length;

    return {
      ready: registryOk && documented >= 15,
      td012: documented >= 17 ? 'yellow-minimum' : documented >= 12 ? 'partial' : 'down',
      registryFile: registryOk,
      activeEvents: documented,
      plannedEvents: 0,
      domains: Object.keys(byDomain).length,
      byDomain,
      events: active.map((e) => e.name),
      pactBroker: false,
      note: 'Pact broker odłożony — Event Registry jako SSOT (ADR-007 warstwa 1)',
      checkedAt: new Date().toISOString(),
    };
  }
}
