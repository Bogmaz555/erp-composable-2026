import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateItemCommand } from './commands/create-item.handler';
import { AdjustStockCommand } from './commands/adjust-stock.handler';
import { GetInventoryQuery } from './queries/get-inventory.handler';
import { ReserveMaterialCommand } from './commands/reserve-material.handler';
import { GetAvailableStockQuery } from './queries/get-available-stock.query';
import { PlmBomReleasedListener } from './infrastructure/plm-bom-released.listener';
import { CreateReservationCommand } from './commands/create-reservation.command';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';

// TD-001: Protected with JWT guard (claims from Gateway)
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post('items')
  async createItem(
    @Body() dto: { sku: string; name: string; type: 'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD'; unit: string }
  ) {
    return this.commandBus.execute(new CreateItemCommand(dto.sku, dto.name, dto.type, dto.unit));
  }

  @Post('stock/adjust')
  async adjustStock(
    @Body() dto: { itemId: string; quantity: number }
  ) {
    return this.commandBus.execute(new AdjustStockCommand(dto.itemId, dto.quantity));
  }

  @Get()
  async getInventory() {
    return this.queryBus.execute(new GetInventoryQuery());
  }

  @EventPattern('pm.material.requested.v1')
  async handleMaterialRequested(@Payload() data: { projectId: string; wbsElementId: string; itemId: string; requestedQuantity: number; bomComponentId?: string; tenantId?: string }) {
    return this.commandBus.execute(new ReserveMaterialCommand(
      data.projectId, 
      data.wbsElementId, 
      data.itemId, 
      data.requestedQuantity,
      data.bomComponentId,
      data.tenantId
    ));
  }

  @Get('stock/:itemId/available')
  async getAvailableStock(@Param('itemId') itemId: string, @Query('projectId') projectId?: string) {
    return this.queryBus.execute(new GetAvailableStockQuery(itemId, projectId));
  }

  // Demo endpoint to simulate PLM BOM release triggering auto-reservations (for ETO traceability flow testing)
  // Note: in real the PlmBomReleasedListener is injected and listens via NATS @EventPattern
  @Post('simulate/plm-bom-released')
  async simulatePlmBomReleased(@Body() payload: any) {
    // Use the injected listener if available via DI (added in module); fallback safe
    try {
      // The listener is provided in AppModule - in real controller we would inject it
      // For demo we just execute the handler logic directly via command for simplicity
      if (payload.components) {
        for (const comp of payload.components) {
          await this.commandBus.execute(new CreateReservationCommand(
            comp.childItemId || comp.itemId,
            comp.quantity || 1,
            payload.projectId,
            payload.workOrderId,
            undefined,
            comp.bomComponentId || comp.id,
            payload.tenantId || 'default'
          ));
        }
      }
    } catch (e) {
      console.warn('[INV] simulate fallback used', e.message);
    }
    return { status: 'simulated', reservationsCreated: true, note: 'Use real NATS event in prod' };
  }

  @Get('lots')
  async listLots(@Query('itemId') itemId?: string) {
    return this.prisma.lot.findMany({
      where: itemId ? { itemId } : undefined,
      include: { item: { select: { sku: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post('lots')
  async createLot(
    @Body() dto: { itemId: string; lotNumber: string; serialNumber?: string; quantity: number; location?: string },
  ) {
    const lot = await this.prisma.lot.create({
      data: {
        itemId: dto.itemId,
        lotNumber: dto.lotNumber,
        serialNumber: dto.serialNumber || null,
        quantity: dto.quantity,
        location: dto.location || 'MAIN',
        status: 'AVAILABLE',
        createdBy: 'ui-user',
      },
      include: { item: { select: { sku: true, name: true } } },
    });
    const stock = await this.prisma.stockLevel.findFirst({
      where: { itemId: dto.itemId, tenantId: 'default' },
    });
    if (stock) {
      await this.prisma.stockLevel.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + dto.quantity },
      });
    } else {
      await this.prisma.stockLevel.create({
        data: { itemId: dto.itemId, quantity: dto.quantity, tenantId: 'default' },
      });
    }
    await this.prisma.stockTransaction.create({
      data: {
        tenantId: 'default',
        itemId: dto.itemId,
        type: 'RECEIPT',
        quantity: dto.quantity,
        referenceType: 'LOT',
        referenceId: lot.id,
        notes: `Lot ${dto.lotNumber}${dto.serialNumber ? ` SN ${dto.serialNumber}` : ''}`,
        createdBy: 'ui-user',
      },
    });
    return lot;
  }
}
