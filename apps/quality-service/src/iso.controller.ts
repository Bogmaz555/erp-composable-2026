import { Controller, Get, Post, Patch, Body, Param, Headers } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { randomUUID } from 'crypto';

@Controller()
export class IsoController {
  constructor(private readonly prisma: PrismaService) {}

  private async seedDefaults() {
    const count = await this.prisma.isoDocument.count();
    if (count > 0) return;
    const docs = [
      { code: 'QMS-POL-01', title: 'Polityka jakości', clause: '§5.2', owner: 'Dyrektor jakości' },
      { code: 'QMS-PROC-02', title: 'Procedura kontroli przyjęcia', clause: '§8.5.1', owner: 'Kierownik QMS' },
      { code: 'QMS-PROC-03', title: 'Procedura CAPA', clause: '§10.2', owner: 'Kierownik QMS' },
      { code: 'QMS-REC-04', title: 'Rejestr NCR', clause: '§8.7', owner: 'Inspektor' },
      { code: 'QMS-REC-05', title: 'Plan kontroli produktu', clause: '§8.5.2', owner: 'Inżynier jakości' },
    ];
    const reviewDue = new Date();
    reviewDue.setMonth(reviewDue.getMonth() + 6);
    for (const d of docs) {
      await this.prisma.isoDocument.create({
        data: { id: randomUUID(), ...d, reviewDue, status: 'ACTIVE' },
      });
    }
  }

  private tenant(headers: Record<string, string | string[] | undefined>) {
    const raw = headers['x-tenant-id'];
    const id = Array.isArray(raw) ? raw[0] : raw;
    return id && id !== 'public' ? id : 'default';
  }

  @Get('iso/documents')
  async list(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.seedDefaults();
    const tenantId = this.tenant(headers);
    return this.prisma.isoDocument.findMany({
      where: { tenantId: { in: [tenantId, 'default'] } },
      orderBy: [{ clause: 'asc' }, { code: 'asc' }],
    });
  }

  @Get('iso/summary')
  async summary(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.seedDefaults();
    const tenantId = this.tenant(headers);
    const docs = await this.prisma.isoDocument.findMany({
      where: { tenantId: { in: [tenantId, 'default'] } },
    });
    const now = new Date();
    const overdue = docs.filter((d) => d.reviewDue && d.reviewDue < now && d.status === 'ACTIVE');
    const byClause = docs.reduce<Record<string, number>>((acc, d) => {
      acc[d.clause] = (acc[d.clause] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: docs.length,
      active: docs.filter((d) => d.status === 'ACTIVE').length,
      overdueReview: overdue.length,
      clauses: byClause,
      complianceScore: Math.round(((docs.length - overdue.length) / Math.max(docs.length, 1)) * 100),
    };
  }

  @Post('iso/documents')
  async create(@Body() body: {
    code: string; title: string; clause: string; version?: string; owner?: string;
  }) {
    return this.prisma.isoDocument.create({
      data: {
        id: randomUUID(),
        code: body.code,
        title: body.title,
        clause: body.clause,
        version: body.version ?? '1.0',
        owner: body.owner,
      },
    });
  }

  @Patch('iso/documents/:id/review')
  async markReviewed(@Param('id') id: string) {
    const next = new Date();
    next.setMonth(next.getMonth() + 12);
    return this.prisma.isoDocument.update({
      where: { id },
      data: { reviewDue: next, updatedAt: new Date() },
    });
  }
}
