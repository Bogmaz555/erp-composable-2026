import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy, NatsRecordBuilder } from '@nestjs/microservices';
import { PrismaClient, OutboxStatus } from '.prisma/client-crm';
import { propagation, context } from '@opentelemetry/api';
import { headers as natsHeaders } from 'nats';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private prisma: PrismaClient;

  constructor(@Inject('NATS_SERVICE') private readonly natsClient: ClientProxy) {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.natsClient.connect();
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.natsClient.close();
  }

  @Interval(3000)
  async relayEvents() {
    try {
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: { status: OutboxStatus.PENDING },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });

      if (pendingEvents.length === 0) return;

      this.logger.debug(`Found ${pendingEvents.length} pending events to relay...`);

      for (const event of pendingEvents) {
        try {
          const hdrs = natsHeaders();
          const carrier: Record<string, string> = {};
          propagation.inject(context.active(), carrier);
          
          for (const [k, v] of Object.entries(carrier)) {
            hdrs.append(k, v);
          }

          const record = new NatsRecordBuilder(event.payload).setHeaders(hdrs).build();
          this.natsClient.emit('crm.opportunity.accepted.v1', record);
          
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.PROCESSED,
              processedAt: new Date(),
            },
          });
          
          this.logger.debug(`Successfully relayed event ${event.id}`);
        } catch (error) {
          this.logger.error(`Failed to relay event ${event.id}`, error);
        }
      }
    } catch (e) {
      this.logger.error(`Error fetching outbox events`, e);
    }
  }
}
