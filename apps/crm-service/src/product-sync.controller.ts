import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';

interface ProductPayload {
  id: string;
  partNumber: string;
  name: string;
  category?: string | null;
  type?: string;
  standardCost?: number | null;
  currency?: string;
}

// PLM type → CRM CatalogItem.ItemType (HARDWARE | SERVICE | SOFTWARE)
function mapCrmType(plmType?: string): 'HARDWARE' | 'SERVICE' | 'SOFTWARE' {
  if (plmType === 'SERVICE') return 'SERVICE';
  return 'HARDWARE';
}

/**
 * Subskrybent danych podstawowych: PLM (Product Master) jest źródłem prawdy.
 * CRM utrzymuje lokalną kopię katalogu sprzedażowego (CatalogItem, sku = partNumber).
 */
@Controller()
export class ProductSyncController {
  private readonly logger = new Logger(ProductSyncController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('product.created.v1')
  async onCreated(@Payload() p: ProductPayload) {
    await this.upsert(p);
  }

  @EventPattern('product.updated.v1')
  async onUpdated(@Payload() p: ProductPayload) {
    await this.upsert(p);
  }

  private async upsert(p: ProductPayload) {
    if (!p?.partNumber) return;
    const existing = await this.prisma.catalogItem.findUnique({ where: { sku: p.partNumber } });
    const data = {
      name: p.name,
      category: p.category || 'Ogólne',
      type: mapCrmType(p.type),
      basePrice: p.standardCost ?? 0,
      currency: p.currency || 'PLN',
      updatedAt: new Date(),
    };
    if (existing) {
      await this.prisma.catalogItem.update({ where: { sku: p.partNumber }, data });
    } else {
      await this.prisma.catalogItem.create({
        data: { id: p.id || randomUUID(), sku: p.partNumber, ...data },
      });
    }
    this.logger.log(`[CRM] Synced catalog item ${p.partNumber} from PLM Product Master`);
  }
}
