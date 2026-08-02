import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

@Controller('wms')
export class WmsController {
  constructor(private readonly prisma: PrismaService) {}

  private async seedWms() {
    const whCount = await this.prisma.warehouse.count();
    if (whCount > 0) return;
    const wh = await this.prisma.warehouse.create({
      data: { id: randomUUID(), code: 'WH-MAIN', name: 'Magazyn Główny ETO' },
    });
    const bins = ['A-01-01', 'A-01-02', 'B-02-01', 'B-02-02', 'C-PICK'];
    for (const code of bins) {
      await this.prisma.storageBin.create({
        data: {
          id: randomUUID(),
          warehouseId: wh.id,
          code,
          zone: code.startsWith('A') ? 'SUROWCE' : code.startsWith('B') ? 'KOMPONENTY' : 'PICK',
          capacity: 500,
        },
      });
    }
  }

  @Get('warehouses')
  async listWarehouses() {
    await this.seedWms();
    return this.prisma.warehouse.findMany({ include: { bins: true } });
  }

  @Get('bins')
  async listBins() {
    await this.seedWms();
    return this.prisma.storageBin.findMany({
      include: { warehouse: true },
      orderBy: { code: 'asc' },
    });
  }

  @Get('pick-lists')
  async listPickLists() {
    return this.prisma.pickList.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lines: true },
      take: 50,
    });
  }

  /** Generuj listę kompletacji z aktywnych rezerwacji */
  @Post('pick-lists')
  async createPickList(@Body() body: { projectId?: string }) {
    await this.seedWms();
    const reservations = await this.prisma.reservation.findMany({
      where: { status: 'ACTIVE', ...(body.projectId ? { projectId: body.projectId } : {}) },
      take: 20,
    });
    const items = await this.prisma.item.findMany({
      where: { id: { in: reservations.map((r) => r.itemId) } },
    });
    const bins = await this.prisma.storageBin.findMany({ take: 5 });
    const pickNumber = `PICK-${Date.now().toString(36).toUpperCase()}`;

    const pickList = await this.prisma.pickList.create({
      data: {
        id: randomUUID(),
        pickNumber,
        projectId: body.projectId,
        status: 'OPEN',
        lines: {
          create: reservations.map((r, i) => {
            const item = items.find((it) => it.id === r.itemId);
            return {
              id: randomUUID(),
              itemId: r.itemId,
              sku: item?.sku ?? r.itemId,
              quantity: r.quantity,
              binCode: bins[i % bins.length]?.code ?? 'A-01-01',
              status: 'PENDING',
            };
          }),
        },
      },
      include: { lines: true },
    });
    return pickList;
  }

  @Patch('pick-lists/:id/lines/:lineId/pick')
  async confirmPick(
    @Param('id') pickListId: string,
    @Param('lineId') lineId: string,
    @Body() body: { pickedQty: number; lotId?: string; serialNumber?: string },
  ) {
    const pickList = await this.prisma.pickList.findUnique({
      where: { id: pickListId },
    });
    const line = await this.prisma.pickLine.update({
      where: { id: lineId },
      data: {
        pickedQty: body.pickedQty,
        status: body.pickedQty > 0 ? 'PICKED' : 'PENDING',
      },
    });
    const pending = await this.prisma.pickLine.count({
      where: { pickListId, status: 'PENDING' },
    });
    if (pending === 0) {
      await this.prisma.pickList.update({
        where: { id: pickListId },
        data: { status: 'COMPLETED' },
      });
    } else {
      await this.prisma.pickList.update({
        where: { id: pickListId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Q1 E1.4 — WMS pick confirm emits inv.stock.out.v1 via outbox (event-only to peers)
    if (body.pickedQty > 0) {
      try {
        await this.prisma.stockTransaction.create({
          data: {
            id: randomUUID(),
            tenantId: 'default',
            itemId: line.itemId,
            quantity: -Math.abs(body.pickedQty),
            type: 'PICK',
            lotId: body.lotId ?? null,
            referenceType: 'PickList',
            referenceId: pickListId,
          },
        });
      } catch {
        /* schema may vary — outbox is primary integration */
      }
      await this.prisma.outboxEvent.create({
        data: {
          id: randomUUID(),
          aggregateId: pickListId,
          aggregateType: 'PickList',
          eventType: 'inv.stock.out.v1',
          payload: {
            itemId: line.itemId,
            sku: line.sku,
            quantity: body.pickedQty,
            missingQuantity: body.pickedQty,
            projectId: pickList?.projectId ?? undefined,
            wbsElementId: pickListId,
            lotId: body.lotId,
            serialNumber: body.serialNumber,
            pickListId,
            pickLineId: lineId,
            source: 'WMS_PICK',
          },
          status: 'PENDING',
        },
      });
    }

    return line;
  }
}
