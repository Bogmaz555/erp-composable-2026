import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { OutboxStatus } from '.prisma/client-inv';

@Injectable()
export class InvOutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvOutboxRelayService.name);
  private readonly maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS || 5);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.natsClient.connect().catch(() => {});
  }

  async onModuleDestroy() {
    this.natsClient.close();
  }

  @Interval(3000)
  async relayEvents() {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      take: 50,
      orderBy: { createdAt: 'asc' },
    }).catch(() => []);

    for (const event of pending) {
      try {
        this.natsClient.emit(event.eventType, event.payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: OutboxStatus.PROCESSED, processedAt: new Date() },
        });
        this.logger.debug(`[INV Outbox] Relayed ${event.eventType}`);
      } catch (e) {
        const attempts = (event.attempts ?? 0) + 1;
        const dead = attempts >= this.maxAttempts;
        await this.prisma.outboxEvent
          .update({
            where: { id: event.id },
            data: {
              attempts,
              lastError: (e as Error).message?.slice(0, 500),
              ...(dead ? { status: OutboxStatus.FAILED } : {}),
            },
          })
          .catch(() => {});
        this.logger.warn(
          `[INV Outbox] ${dead ? 'DEAD-LETTER' : 'retry'} ${event.eventType} (attempt ${attempts}/${this.maxAttempts}): ${(e as Error).message}`,
        );
      }
    }
  }
}
