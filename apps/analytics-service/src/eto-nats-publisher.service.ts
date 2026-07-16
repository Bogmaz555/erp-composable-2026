import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { connect, StringCodec, NatsConnection } from 'nats';

@Injectable()
export class EtoNatsPublisherService implements OnModuleInit {
  private readonly logger = new Logger(EtoNatsPublisherService.name);
  private directNc: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  async onModuleInit() {
    try {
      this.directNc = await connect({
        servers: process.env.NATS_URL || 'nats://127.0.0.1:4222',
        timeout: 3000,
      });
      this.logger.log('Direct NATS publisher connected');
    } catch {
      this.logger.warn('Direct NATS unavailable — fallback to ClientProxy emit');
    }
  }

  async publish(subject: string, payload: Record<string, unknown>): Promise<boolean> {
    const body = { ...payload, publishedAt: new Date().toISOString() };
    try {
      if (this.directNc) {
        this.directNc.publish(subject, this.sc.encode(JSON.stringify(body)));
        return true;
      }
      this.nats.emit(subject, body);
      return true;
    } catch (e) {
      this.logger.warn(`NATS publish failed ${subject}: ${(e as Error).message}`);
      return false;
    }
  }

  async publishCompensation(
    action: string,
    correlationId: string,
    projectId: string,
    step: string,
  ) {
    return this.publish(action, {
      correlationId,
      projectId,
      tenantId: 'default',
      compensate: true,
      compensatedStep: step,
      source: 'eto-saga-orchestrator',
    });
  }
}
