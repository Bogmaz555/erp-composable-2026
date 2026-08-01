import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from './prisma/prisma.service';
import { GenericOutboxRelay } from '@erp/shared-kernel';

/**
 * Quality outbox relay — thin wrapper around shared GenericOutboxRelay v2.
 * No local dual semantics: claim PROCESSING, await publish, attempts/FAILED.
 */
@Injectable()
export class QualityOutboxRelayService
  extends GenericOutboxRelay
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(QualityOutboxRelayService.name);
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
    this.natsClient.close();
  }

  @Interval(3000)
  override async relayEvents() {
    await super.relayEvents();
  }
}
