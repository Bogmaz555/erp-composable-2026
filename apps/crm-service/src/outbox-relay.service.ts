import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaClient } from '.prisma/client-crm';
import { GenericOutboxRelay } from '@erp/shared-kernel';

@Injectable()
export class OutboxRelayService extends GenericOutboxRelay implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(OutboxRelayService.name);
  protected prisma: PrismaClient;

  constructor(@Inject('NATS_SERVICE') protected readonly natsClient: ClientProxy) {
    super();
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.natsClient.connect();
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.closeJetStreamTransport();
    await this.prisma.$disconnect();
    this.natsClient.close();
  }

  @Interval(3000)
  override async relayEvents() {
    await super.relayEvents();
  }
}
