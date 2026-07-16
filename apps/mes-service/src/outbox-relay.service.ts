import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

@Injectable()
export class MesOutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MesOutboxRelayService.name);

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
    const pending = await this.prisma.outboxEvent
      .findMany({
        where: { status: 'PENDING' },
        take: 50,
        orderBy: { createdAt: 'asc' },
      })
      .catch(() => []);

    for (const event of pending) {
      try {
        this.natsClient.emit(event.eventType, event.payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED' },
        });
        this.logger.debug(`[MES Outbox] ${event.eventType} emitted.`);
      } catch (e) {
        await this.prisma.outboxEvent
          .update({
            where: { id: event.id },
            data: {
              status: 'FAILED',
            },
          })
          .catch(() => {});
        this.logger.warn(`[MES Outbox] Error emitting ${event.eventType}: ${(e as Error).message}`);
      }
    }
  }
}
