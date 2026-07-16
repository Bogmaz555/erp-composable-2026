import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

interface ProductPayload {
  id: string;
  partNumber: string;
  name: string;
  description?: string | null;
  type?: string;
  isActive?: boolean;
}

// Mapuje typ z Kartoteki Produktów (PLM) na typ magazynowy INV.
function mapInvType(plmType?: string): string {
  switch (plmType) {
    case 'CONSUMABLE': return 'RAW_MATERIAL';
    case 'ASSEMBLY':
    case 'MACHINE': return 'FINISHED_GOOD';
    case 'PART':
    case 'TOOL':
    case 'SERVICE':
    default: return 'COMPONENT';
  }
}

/**
 * Subskrybent danych podstawowych: PLM (Product Master) jest źródłem prawdy.
 * INV utrzymuje lokalną kopię kartoteki magazynowej (Item, sku = partNumber).
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

  @EventPattern('product.deactivated.v1')
  async onDeactivated(@Payload() p: ProductPayload) {
    await this.prisma.item.updateMany({
      where: { sku: p.partNumber },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`[INV] Product ${p.partNumber} deactivated (soft-deleted local copy)`);
  }

  private async upsert(p: ProductPayload) {
    if (!p?.partNumber) return;
    await this.prisma.item.upsert({
      where: { sku: p.partNumber },
      update: {
        name: p.name,
        description: p.description ?? null,
        type: mapInvType(p.type),
        deletedAt: p.isActive === false ? new Date() : null,
      },
      create: {
        sku: p.partNumber,
        name: p.name,
        description: p.description ?? null,
        type: mapInvType(p.type),
        createdBy: 'product-master',
      },
    });
    this.logger.log(`[INV] Synced product ${p.partNumber} from PLM Product Master`);
  }
}
