import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '.prisma/client-inv';
import { emitStockShortage } from '../inv-stock-out.helper';

export class ReserveMaterialCommand {
  constructor(
    public readonly projectId: string,
    public readonly wbsElementId: string,
    public readonly sku: string,
    public readonly quantity: number,
    public readonly bomComponentId?: string,  // ETO traceability from PM explosion / PLM
    public readonly tenantId?: string,
  ) {}
}

@CommandHandler(ReserveMaterialCommand)
export class ReserveMaterialHandler implements ICommandHandler<ReserveMaterialCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReserveMaterialCommand) {
    const tenantId = command.tenantId || 'default';
    const bomComponentId = command.bomComponentId || null;

    const item = await this.prisma.item.findUnique({
      where: { sku: command.sku },
      include: { stockLevels: true },
    });

    if (!item) {
      await emitStockShortage(this.prisma, {
        itemId: command.sku,
        sku: command.sku,
        missingQuantity: command.quantity,
        projectId: command.projectId,
        wbsElementId: command.wbsElementId,
        bomComponentId: command.bomComponentId,
        tenantId,
      });
      console.error(`[INV] SKU ${command.sku} missing → inv.stock.out.v1`);
      return { status: 'SHORTAGE', reason: 'ITEM_NOT_FOUND' };
    }

    const stock = item.stockLevels[0];
    if (!stock) {
      await emitStockShortage(this.prisma, {
        itemId: command.sku,
        sku: command.sku,
        missingQuantity: command.quantity,
        projectId: command.projectId,
        wbsElementId: command.wbsElementId,
        bomComponentId: command.bomComponentId || undefined,
        tenantId,
      });
      console.error(`[INV] No StockLevel for ${command.sku} → inv.stock.out.v1`);
      return { status: 'SHORTAGE', reason: 'NO_STOCK_LEVEL' };
    }

    const freeQuantity = stock.quantity;
    const isAvailable = freeQuantity >= command.quantity;
    const status = isAvailable ? 'ALLOCATED' : 'SHORTAGE';

    // Legacy requirement (kept for compatibility)
    await this.prisma.requirement.create({ 
      data: { 
        tenantId,
        status: 'PENDING', 
        materialType: 'RAW', 
        quantity: command.quantity,
        createdBy: 'pm-material-request'
      } 
    });

    // Core ETO action: create modern Reservation with bomComponentId + immutable StockTransaction
    // This unifies the direct bom.released path and the pm.material.requested.v1 path
    const reservation = await this.prisma.reservation.create({
      data: {
        tenantId,
        projectId: command.projectId,
        workOrderId: null,
        bomComponentId,
        itemId: item.id,  // use internal id, not sku
        quantity: command.quantity,
        status: 'ACTIVE',
        createdBy: 'pm-material-request',
      },
    });

    await this.prisma.stockTransaction.create({
      data: {
        tenantId,
        itemId: item.id,
        type: 'RESERVATION',
        quantity: command.quantity,
        referenceType: 'WBS_ELEMENT',
        referenceId: command.wbsElementId,
        notes: bomComponentId ? `From PM material request, bomComponent ${bomComponentId}` : 'From PM material request',
        createdBy: 'pm-material-request',
      },
    });

    // Reduce available stock (same pattern as CreateReservationHandler)
    if (stock) {
      await this.prisma.stockLevel.update({
        where: { id: stock.id },
        data: { quantity: Math.max(0, stock.quantity - command.quantity) },
      });
    }

    if (status === 'SHORTAGE') {
      const brakujacaIlosc = freeQuantity > 0 ? command.quantity - freeQuantity : command.quantity;
      await emitStockShortage(this.prisma, {
        itemId: command.sku,
        sku: command.sku,
        missingQuantity: brakujacaIlosc,
        projectId: command.projectId,
        wbsElementId: command.wbsElementId,
        bomComponentId: bomComponentId || undefined,
        tenantId,
      });
      console.log(`[INV] Shortage ${command.sku} → inv.stock.out.v1 (qty ${brakujacaIlosc})`);
    }

    console.log(`[INV] Reservation created via material request (bomComponentId=${bomComponentId})`);

    // Publish the canonical reservation event via Outbox (unified path)
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateId: reservation.id,
        aggregateType: 'Reservation',
        eventType: 'inventory.reservation.created.v1',
        payload: {
          reservationId: reservation.id,
          tenantId,
          projectId: command.projectId,
          wbsElementId: command.wbsElementId,
          bomComponentId,
          itemId: item.id,
          quantity: command.quantity,
          status: 'ACTIVE',
          createdAt: new Date(),
          createdBy: 'pm-material-request',
        },
        status: OutboxStatus.PENDING,
      },
    }).catch(() => { /* non-fatal in env */ });

    return { status, reservationId: reservation.id };
  }
}
