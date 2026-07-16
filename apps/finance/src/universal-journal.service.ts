import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface JournalRecordInput {
  tenantId?: string;
  projectId?: string;
  wbsElementId?: string;
  eventType: string;
  sourceModule: string;
  amount: number;
  currency?: string;
  referenceId?: string;
  description?: string;
}

@Injectable()
export class UniversalJournalService {
  private readonly logger = new Logger(UniversalJournalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: JournalRecordInput) {
    if (!input.amount || input.amount === 0) return null;
    try {
      return await this.prisma.universalJournalEntry.create({
        data: {
          tenantId: input.tenantId || 'default',
          projectId: input.projectId,
          wbsElementId: input.wbsElementId,
          eventType: input.eventType,
          sourceModule: input.sourceModule,
          amount: input.amount,
          currency: input.currency || 'PLN',
          referenceId: input.referenceId,
          description: input.description,
        },
      });
    } catch (e) {
      this.logger.warn(`journal skip: ${(e as Error).message}`);
      return null;
    }
  }

  async list(tenantId = 'default', take = 50) {
    return this.prisma.universalJournalEntry.findMany({
      where: { tenantId },
      orderBy: { bookedAt: 'desc' },
      take,
    });
  }

  async summary(tenantId = 'default') {
    const rows = await this.prisma.universalJournalEntry.groupBy({
      by: ['sourceModule'],
      where: { tenantId },
      _sum: { amount: true },
      _count: true,
    });
    const total = rows.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
    return { tenantId, totalAmount: total, byModule: rows, entryCount: rows.reduce((s, r) => s + r._count, 0) };
  }
}
