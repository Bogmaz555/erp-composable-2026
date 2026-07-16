import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { ClientProxy } from '@nestjs/microservices';

// Basic Outbox relay for reliable event publishing (NATS wired for Faza 1)
@Injectable()
export class OutboxRelayService implements OnModuleInit {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.logger.log('PLM OutboxRelayService initialized (Faza 1 - NATS wired)');
  }

  @Interval(5000)
  async relayPendingEvents() {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 10,
    });

    for (const event of pending) {
      try {
        this.natsClient.emit(event.eventType, event.payload);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
        this.logger.debug(`Relayed ${event.eventType} for ${event.aggregateId}`);
      } catch (err) {
        this.logger.error(`Failed to relay outbox ${event.id}`, err);
      }
    }
  }
}
