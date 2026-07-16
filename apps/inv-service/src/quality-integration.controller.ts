import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

export interface InspectionPayload {
  inspectionId: string;
  referenceId: string; // PO Number
  type: string;
  result: 'PASSED' | 'FAILED';
  notes?: string;
  evaluatedBy?: string;
  tenantId?: string;
}

@Controller()
export class QualityIntegrationController {
  private readonly logger = new Logger(QualityIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('quality.inspection.passed.v1')
  async handleInspectionPassed(@Payload() payload: InspectionPayload) {
    this.logger.log(`[INV] Inspection PASSED for PO ${payload.referenceId}. Releasing from QUARANTINE.`);
    
    // Weryfikacja: szukamy transakcji przyjęcia z tego PO, żeby wiedzieć o jaki Item chodzi i jaką ilość
    const receiptTx = await this.prisma.stockTransaction.findFirst({
      where: {
        referenceId: payload.referenceId,
        referenceType: 'PURCHASE_ORDER',
        type: 'RECEIPT',
      },
    });

    if (!receiptTx) {
      this.logger.warn(`[INV] Cannot release quarantine: No RECEIPT transaction found for PO ${payload.referenceId}`);
      return;
    }

    const item = await this.prisma.item.findUnique({ where: { id: receiptTx.itemId } });
    if (!item) return;

    // Pobierz z Kwarantanny
    const quarantineStock = await this.prisma.stockLevel.findFirst({
      where: { itemId: item.id, location: 'QUARANTINE' },
    });

    if (!quarantineStock || quarantineStock.quantity < receiptTx.quantity) {
      this.logger.warn(`[INV] Not enough stock in QUARANTINE to release for PO ${payload.referenceId}`);
      return;
    }

    // Zdejmij z kwarantanny
    await this.prisma.stockLevel.update({
      where: { id: quarantineStock.id },
      data: { quantity: quarantineStock.quantity - receiptTx.quantity },
    });

    // Przenieś na MAIN
    const mainStock = await this.prisma.stockLevel.findFirst({
      where: { itemId: item.id, location: 'MAIN' },
    });

    if (mainStock) {
      await this.prisma.stockLevel.update({
        where: { id: mainStock.id },
        data: { quantity: mainStock.quantity + receiptTx.quantity },
      });
    } else {
      await this.prisma.stockLevel.create({
        data: {
          tenantId: 'default',
          itemId: item.id,
          quantity: receiptTx.quantity,
          location: 'MAIN',
        },
      });
    }

    // Zaloguj transakcję
    await this.prisma.stockTransaction.create({
      data: {
        tenantId: 'default',
        itemId: item.id,
        type: 'RELEASE_QUARANTINE',
        quantity: receiptTx.quantity,
        referenceType: 'INSPECTION',
        referenceId: payload.inspectionId,
        notes: `Released from QUARANTINE to MAIN. PO: ${payload.referenceId}`,
        createdBy: payload.evaluatedBy || 'QualityInspector',
      },
    });

    this.logger.log(`[INV] Successfully released ${receiptTx.quantity}x ${item.sku} to MAIN.`);
  }

  @EventPattern('quality.inspection.failed.v1')
  async handleInspectionFailed(@Payload() payload: InspectionPayload) {
    this.logger.warn(`[INV] Inspection FAILED for PO ${payload.referenceId}. Keeping in QUARANTINE / moving to SCRAP.`);
    
    const receiptTx = await this.prisma.stockTransaction.findFirst({
      where: {
        referenceId: payload.referenceId,
        referenceType: 'PURCHASE_ORDER',
        type: 'RECEIPT',
      },
    });

    if (!receiptTx) return;
    
    // W scenariuszu FAILED można by przenieść do lokalizacji SCRAP, 
    // dla prostoty na razie zmieniamy wpis w logu
    await this.prisma.stockTransaction.create({
      data: {
        tenantId: 'default',
        itemId: receiptTx.itemId,
        type: 'ADJUST',
        quantity: 0, // Not releasing any
        referenceType: 'INSPECTION',
        referenceId: payload.inspectionId,
        notes: `Inspection FAILED. Stock locked in QUARANTINE. PO: ${payload.referenceId}`,
        createdBy: payload.evaluatedBy || 'QualityInspector',
      },
    });
  }
}
