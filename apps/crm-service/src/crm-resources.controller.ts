import { Controller, Get, Post, Put, Patch, Body, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import { ItemType } from '.prisma/client-crm';

@Controller()
export class CrmResourcesController {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.isolatedClient;
  }

  @Get('catalog')
  async listCatalog() {
    return this.db().catalogItem.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  @Post('catalog')
  async createCatalog(@Body() body: {
    sku: string;
    name: string;
    category: string;
    type?: ItemType;
    basePrice: number | string;
    currency?: string;
  }) {
    if (!body.sku?.trim() || !body.name?.trim() || !body.category?.trim()) {
      throw new BadRequestException('sku, name i category są wymagane');
    }
    const existing = await this.db().catalogItem.findUnique({ where: { sku: body.sku } });
    if (existing) throw new BadRequestException(`SKU ${body.sku} już istnieje`);

    return this.db().catalogItem.create({
      data: {
        id: randomUUID(),
        sku: body.sku.trim(),
        name: body.name.trim(),
        category: body.category.trim(),
        type: (body.type as ItemType) || 'HARDWARE',
        basePrice: parseFloat(String(body.basePrice)) || 0,
        currency: body.currency || 'PLN',
        updatedAt: new Date(),
      },
    });
  }

  @Get('tasks')
  async listTasks() {
    return this.db().task.findMany({
      where: { isCompleted: false },
      orderBy: { dueDate: 'asc' },
      include: { Opportunity: { select: { id: true, title: true } } },
    }).then((rows) =>
      rows.map((t) => ({
        ...t,
        opportunity: t.Opportunity,
        Opportunity: undefined,
      })),
    );
  }

  @Patch('tasks')
  async patchTask(@Body() body: { id: string; isCompleted?: boolean; title?: string }) {
    if (!body.id) throw new BadRequestException('id jest wymagane');
    const data: any = { updatedAt: new Date() };
    if (body.isCompleted !== undefined) data.isCompleted = body.isCompleted;
    if (body.title !== undefined) data.title = body.title;
    return this.db().task.update({ where: { id: body.id }, data });
  }

  @Post('documents')
  async createDocument(@Body() body: {
    opportunityId: string;
    fileName: string;
    fileType: string;
    fileUrl?: string;
  }) {
    if (!body.opportunityId || !body.fileName) {
      throw new BadRequestException('opportunityId i fileName są wymagane');
    }
    return this.db().document.create({
      data: {
        id: randomUUID(),
        opportunityId: body.opportunityId,
        fileName: body.fileName,
        fileType: body.fileType || 'DOC',
        fileUrl: body.fileUrl || `/files/${body.fileName}`,
      },
    });
  }

  @Post('activities')
  async createActivity(@Body() body: {
    opportunityId: string;
    content: string;
    type?: string;
  }) {
    if (!body.opportunityId || !body.content?.trim()) {
      throw new BadRequestException('opportunityId i content są wymagane');
    }
    return this.db().activity.create({
      data: {
        id: randomUUID(),
        opportunityId: body.opportunityId,
        content: body.content.trim(),
        type: body.type || 'NOTE',
      },
    });
  }

  @Put('bom')
  async saveBom(@Body() body: {
    opportunityId: string;
    items: { catalogItemId: string; quantity: number; price: number }[];
  }) {
    if (!body.opportunityId) throw new BadRequestException('opportunityId jest wymagane');

    await this.db().bOMItem.deleteMany({ where: { opportunityId: body.opportunityId } });

    let tkw = 0;
    let targetRevenue = 0;
    const itemsToCreate: any[] = [];

    if (body.items?.length) {
      // Pobieramy katalog by zablokować marżę po stronie backendu
      const catalogIds = body.items.map(i => i.catalogItemId);
      const catalog = await this.db().catalogItem.findMany({
        where: { id: { in: catalogIds } }
      });
      const catalogMap = new Map(catalog.map(c => [c.id, c]));

      for (const item of body.items) {
        const catItem = catalogMap.get(item.catalogItemId);
        if (!catItem) continue;

        const baseCost = catItem.basePrice * (item.quantity || 1);
        tkw += baseCost;

        // Twarde narzuty marżowe zdefiniowane po stronie backendu
        let margin = 1.0;
        if (catItem.type === 'HARDWARE') margin = 1.15;
        if (catItem.type === 'SOFTWARE') margin = 1.35;
        if (catItem.type === 'SERVICE') margin = 1.50;

        targetRevenue += baseCost * margin;

        itemsToCreate.push({
          id: randomUUID(),
          opportunityId: body.opportunityId,
          catalogItemId: item.catalogItemId,
          quantity: item.quantity || 1,
          price: catItem.basePrice * margin, // cena dla klienta z wliczoną marżą
          updatedAt: new Date(),
        });
      }

      if (itemsToCreate.length > 0) {
        await this.db().bOMItem.createMany({ data: itemsToCreate });
      }
    }

    // Aktualizacja szansy o tkw (Baseline Cost) i value (Target Revenue)
    await this.db().opportunity.update({
      where: { id: body.opportunityId },
      data: { 
        tkw, 
        value: targetRevenue, 
        updatedAt: new Date() 
      },
    });

    return { 
      ok: true, 
      opportunityId: body.opportunityId, 
      itemCount: itemsToCreate.length, 
      tkw,
      total: targetRevenue 
    };
  }
}
