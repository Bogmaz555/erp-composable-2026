import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface MrpNetLine {
  sku: string;
  grossRequirement: number;
  onHand: number;
  onOrder: number;
  netRequirement: number;
  leadTimeDays: number;
  suggestedOrderDate: string;
  supplierCode?: string;
}

const INV_URL = process.env.INV_SERVICE_URL || 'http://127.0.0.1:4003';
const DEFAULT_LEAD_DAYS = 14;

@Injectable()
export class MrpNettingService {
  private readonly logger = new Logger(MrpNettingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async fetchOnHandBySku(): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    try {
      const res = await fetch(`${INV_URL}/inventory`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return map;
      const items = (await res.json()) as Array<{ sku: string; stockQuantity?: number; stockLevels?: { quantity: number }[] }>;
      for (const item of items) {
        const fromLevels = item.stockLevels?.reduce((s, l) => s + (l.quantity || 0), 0) ?? 0;
        map[item.sku] = item.stockQuantity ?? fromLevels;
      }
    } catch (e) {
      this.logger.warn(`INV fetch failed: ${(e as Error).message}`);
    }
    return map;
  }

  async computeNetting(projectId?: string): Promise<{ lines: MrpNetLine[]; runAt: string }> {
    const where = projectId ? { projectId } : {};
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { ...where, status: { notIn: ['REJECTED', 'RECEIVED', 'DELIVERED', 'CLOSED'] } },
      include: { supplier: true },
    });

    const suppliers = await this.prisma.supplier.findMany({ where: { isActive: true } });
    const minLead = suppliers.reduce((m, s) => Math.min(m, s.leadTimeDays ?? DEFAULT_LEAD_DAYS), DEFAULT_LEAD_DAYS);

    const onHand = await this.fetchOnHandBySku();
    const grossBySku: Record<string, number> = {};
    const onOrderBySku: Record<string, number> = {};
    const leadBySku: Record<string, number> = {};

    for (const po of orders) {
      const sku = po.sku;
      if (['DRAFT', 'PENDING_APPROVAL'].includes(po.status)) {
        grossBySku[sku] = (grossBySku[sku] ?? 0) + po.amount;
      }
      if (po.status === 'APPROVED') {
        onOrderBySku[sku] = (onOrderBySku[sku] ?? 0) + po.amount;
      }
      if (po.supplier?.leadTimeDays != null) {
        leadBySku[sku] = Math.min(leadBySku[sku] ?? 999, po.supplier.leadTimeDays);
      }
    }

    const allSkus = new Set([...Object.keys(grossBySku), ...Object.keys(onHand), ...Object.keys(onOrderBySku)]);
    const lines: MrpNetLine[] = [];
    const today = new Date();

    for (const sku of allSkus) {
      const gross = grossBySku[sku] ?? 0;
      const hand = onHand[sku] ?? 0;
      const onOrder = onOrderBySku[sku] ?? 0;
      const net = Math.max(0, gross - hand - onOrder);
      const lead = leadBySku[sku] ?? minLead;
      const orderDate = new Date(today);
      orderDate.setDate(orderDate.getDate() + lead);
      const bestSupplier = suppliers.find((s) => s.leadTimeDays === lead) ?? suppliers[0];

      if (gross > 0 || net > 0 || hand > 0) {
        lines.push({
          sku,
          grossRequirement: gross,
          onHand: hand,
          onOrder,
          netRequirement: net,
          leadTimeDays: lead,
          suggestedOrderDate: orderDate.toISOString().slice(0, 10),
          supplierCode: bestSupplier?.code,
        });
      }
    }

    lines.sort((a, b) => b.netRequirement - a.netRequirement);
    return { lines, runAt: new Date().toISOString() };
  }
}
