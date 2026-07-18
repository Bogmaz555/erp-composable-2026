import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { GenericOutboxRelay } from '@erp/shared-kernel';

@Injectable()
export class OutboxRelayService extends GenericOutboxRelay implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(OutboxRelayService.name);
  protected prisma: PrismaService;

  constructor(
    @Inject('NATS_SERVICE') protected readonly natsClient: ClientProxy,
    prisma: PrismaService,
  ) {
    super();
    this.prisma = prisma;
  }

  async onModuleInit() {
    await this.natsClient.connect().catch(() => {});
  }

  async onModuleDestroy() {
    this.natsClient.close();
  }

  @Interval(3000)
  override async relayEvents() {
    await super.relayEvents();
  }
}
