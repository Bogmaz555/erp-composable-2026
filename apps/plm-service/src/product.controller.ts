import {
  Controller, Get, Post, Patch, Body, Param, Query, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Product Master (Kartoteka Produktów) — PLM jest źródłem prawdy dla danych podstawowych
 * o pozycjach (Item). Zmiany emitowane jako product.*.v1 przez Outbox do INV/CRM.
 */
@Controller('items')
export class ProductController {
  constructor(private readonly prisma: PrismaService) {}

  private snapshot(item: any) {
    return {
      id: item.id,
      partNumber: item.partNumber,
      name: item.name,
      description: item.description,
      type: item.type,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category,
      material: item.material,
      weightKg: item.weightKg,
      lifecycleStatus: item.lifecycleStatus,
      makeBuy: item.makeBuy,
      revision: item.revision,
      barcode: item.barcode,
      leadTimeDays: item.leadTimeDays,
      standardCost: item.standardCost,
      currency: item.currency,
      isActive: item.isActive,
      attributes: item.attributes,
      updatedAt: item.updatedAt,
    };
  }

  private async emit(eventType: string, item: any) {
    await this.prisma.outboxEvent.create({
      data: {
        aggregateId: item.id,
        aggregateType: 'Item',
        eventType,
        payload: this.snapshot(item),
        status: 'PENDING',
      },
    });
  }

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('makeBuy') makeBuy?: string,
    @Query('active') active?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
  ) {
    const take = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where: any = {};
    if (search) {
      where.OR = [
        { partNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (status) where.lifecycleStatus = status;
    if (makeBuy) where.makeBuy = makeBuy;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const [rows, total] = await Promise.all([
      this.prisma.item.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      this.prisma.item.count({ where }),
    ]);

    return {
      rows,
      total,
      page: parseInt(page, 10) || 1,
      pageSize: take,
      pageCount: Math.ceil(total / take),
    };
  }

  @Get('stats')
  async stats() {
    const [total, active, byType] = await Promise.all([
      this.prisma.item.count(),
      this.prisma.item.count({ where: { isActive: true } }),
      this.prisma.item.groupBy({ by: ['type'], _count: { _all: true } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      byType: byType.map((t: any) => ({ type: t.type, count: t._count._all })),
    };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { bomVersions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!item) throw new NotFoundException('Pozycja nie istnieje');
    return item;
  }

  @Post()
  async create(@Body() body: any) {
    if (!body?.partNumber || !body?.name) {
      throw new BadRequestException('partNumber i name są wymagane');
    }
    const exists = await this.prisma.item.findUnique({ where: { partNumber: body.partNumber } });
    if (exists) throw new BadRequestException(`Indeks ${body.partNumber} już istnieje`);

    const item = await this.prisma.item.create({
      data: {
        partNumber: body.partNumber,
        name: body.name,
        description: body.description ?? null,
        type: body.type ?? 'PART',
        unitOfMeasure: body.unitOfMeasure ?? 'szt',
        category: body.category ?? null,
        material: body.material ?? null,
        weightKg: body.weightKg != null ? Number(body.weightKg) : null,
        lifecycleStatus: body.lifecycleStatus ?? 'ACTIVE',
        makeBuy: body.makeBuy ?? 'BUY',
        revision: body.revision ?? null,
        barcode: body.barcode ?? null,
        leadTimeDays: body.leadTimeDays != null ? parseInt(String(body.leadTimeDays), 10) : null,
        standardCost: body.standardCost != null ? Number(body.standardCost) : null,
        currency: body.currency ?? 'PLN',
        attributes: body.attributes ?? {},
        createdBy: body.createdBy ?? null,
      },
    });

    await this.emit('product.created.v1', item);
    return item;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pozycja nie istnieje');

    const data: any = {};
    for (const f of ['name', 'description', 'type', 'unitOfMeasure', 'category', 'material',
      'lifecycleStatus', 'makeBuy', 'revision', 'barcode', 'currency', 'attributes']) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.weightKg !== undefined) data.weightKg = body.weightKg != null ? Number(body.weightKg) : null;
    if (body.leadTimeDays !== undefined) data.leadTimeDays = body.leadTimeDays != null ? parseInt(String(body.leadTimeDays), 10) : null;
    if (body.standardCost !== undefined) data.standardCost = body.standardCost != null ? Number(body.standardCost) : null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    const item = await this.prisma.item.update({ where: { id }, data });
    await this.emit('product.updated.v1', item);
    return item;
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pozycja nie istnieje');
    const item = await this.prisma.item.update({
      where: { id },
      data: { isActive: false, lifecycleStatus: 'OBSOLETE' },
    });
    await this.emit('product.deactivated.v1', item);
    return item;
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pozycja nie istnieje');
    const item = await this.prisma.item.update({
      where: { id },
      data: { isActive: true, lifecycleStatus: 'ACTIVE' },
    });
    await this.emit('product.updated.v1', item);
    return item;
  }
}
