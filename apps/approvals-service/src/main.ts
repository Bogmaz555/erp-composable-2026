import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ApprovalsServiceModule } from './approvals-service.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ApprovalsServiceModule,
    new FastifyAdapter(),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      queue: 'approvals_service_queue',
    },
  });

  await app.startAllMicroservices();
  // Reassigned from 4009 → 4019 (4009 reserved for eam-service)
  const port = Number(process.env.PORT) || 4019;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`Approvals Service listening on http://${host}:${port}`);
}
bootstrap();
