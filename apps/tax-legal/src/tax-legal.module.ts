import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxRelayService } from './outbox-relay.service';
import { TaxLegalController } from './tax-legal.controller';
import { PrismaService } from './prisma.service';
import { KsefSandboxService } from './ksef-sandbox.service';
import { KsefProductionService } from './ksef-production.service';
import { KsefRouterService } from './ksef-router.service';
import { JpkV7Service } from './jpk-v7.service';
import { JpkKrService } from './jpk-kr.service';
import { JpkKrValidatorService } from './jpk-kr-validator.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [TaxLegalController],
  providers: [
    OutboxRelayService,
    PrismaService,
    KsefSandboxService,
    KsefProductionService,
    KsefRouterService,
    JpkV7Service,
    JpkKrService,
    JpkKrValidatorService,
  ],
})
export class TaxLegalModule {}
