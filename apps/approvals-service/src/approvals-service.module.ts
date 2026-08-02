import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ApprovalsServiceController } from './approvals-service.controller';
import { ApprovalsServiceService } from './approvals-service.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'APPROVALS_PUBLISHER',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [ApprovalsServiceController],
  providers: [ApprovalsServiceService],
})
export class ApprovalsServiceModule {}
