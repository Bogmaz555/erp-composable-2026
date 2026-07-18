import { Logger } from '@nestjs/common';
import { ClientProxy, NatsRecordBuilder } from '@nestjs/microservices';
import { propagation, context } from '@opentelemetry/api';
import { headers as natsHeaders } from 'nats';
import { lastValueFrom } from 'rxjs';

export abstract class GenericOutboxRelay {
  protected abstract readonly logger: Logger;
  protected abstract readonly prisma: any; // e.g. PrismaClient
  protected abstract readonly natsClient: ClientProxy;

  async relayEvents() {
    try {
      // 1. Fetch pending events
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: 50,
        orderBy: { createdAt: 'asc' },
      });

      if (pendingEvents.length === 0) return;

      this.logger.debug(`Found ${pendingEvents.length} pending events to relay...`);

      // 2. Mark them as IN_PROGRESS to avoid double-processing (basic pseudo-lock)
      const eventIds = pendingEvents.map((e: any) => e.id);
      await this.prisma.outboxEvent.updateMany({
        where: { id: { in: eventIds } },
        data: { status: 'IN_PROGRESS' },
      });

      // 3. Process events
      for (const event of pendingEvents) {
        try {
          const hdrs = natsHeaders();
          const carrier: Record<string, string> = {};
          propagation.inject(context.active(), carrier);
          
          for (const [k, v] of Object.entries(carrier)) {
            hdrs.append(k, v);
          }

          const record = new NatsRecordBuilder(event.payload).setHeaders(hdrs).build();
          
          const obs = this.natsClient.emit(event.eventType || event.topic, record);
          await lastValueFrom(obs);
          
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
            },
          });
          
          this.logger.debug(`Successfully relayed event ${event.id}`);
        } catch (error) {
          this.logger.error(`Failed to relay event ${event.id}`, error);
          // Rollback to PENDING or mark as FAILED
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PENDING' },
          }).catch(() => {});
        }
      }
    } catch (e) {
      this.logger.error(`Error fetching outbox events`, e);
    }
  }
}
