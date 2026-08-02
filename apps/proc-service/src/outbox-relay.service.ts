import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { GenericOutboxRelay } from '@erp/shared-kernel';

@Injectable()
export class ProcOutboxRelayService extends GenericOutboxRelay implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(ProcOutboxRelayService.name);
  protected prisma: PrismaService;

  constructor(
    @Inject('NATS_CLIENT') protected readonly natsClient: ClientProxy,
    prisma: PrismaService,
  ) {
    super();
    this.prisma = prisma;
  }

  async onModuleInit() {
    try {
      await this.natsClient.connect();
    } catch (e) {
      this.logger.warn(
        `NATS connect deferred/failed at init: ${(e as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.closeJetStreamTransport();
    this.natsClient.close();
  }

  @Interval(3000)
  override async relayEvents() {
    await super.relayEvents();
  }
}
