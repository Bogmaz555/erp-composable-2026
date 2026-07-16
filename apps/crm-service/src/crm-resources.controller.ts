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

    if (body.items?.length) {
      await this.db().bOMItem.createMany({
        data: body.items.map((item) => ({
          id: randomUUID(),
          opportunityId: body.opportunityId,
          catalogItemId: item.catalogItemId,
          quantity: item.quantity || 1,
          price: item.price || 0,
          updatedAt: new Date(),
        })),
      });
    }

    const total = (body.items || []).reduce((sum, i) => sum + i.quantity * i.price, 0);
    await this.db().opportunity.update({
      where: { id: body.opportunityId },
      data: { value: total, updatedAt: new Date() },
    });

    return { ok: true, opportunityId: body.opportunityId, itemCount: body.items?.length || 0, total };
  }
}
