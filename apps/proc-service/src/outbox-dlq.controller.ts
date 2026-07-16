import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('outbox')
export class OutboxDlqController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dead-letter')
  async deadLetter(@Query('tenantId') tenantId = 'default') {
    const [failed, pending, recent] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { tenantId, status: 'FAILED' } }),
      this.prisma.outboxEvent.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.outboxEvent.findMany({
        where: { tenantId, status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          eventType: true,
          aggregateType: true,
          attempts: true,
          lastError: true,
          createdAt: true,
        },
      }),
    ]);
    return { service: 'proc', tenantId, failed, pending, recent };
  }
}
