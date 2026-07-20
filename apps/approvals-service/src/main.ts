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
  await app.listen(4009, '127.0.0.1');
  console.log('Approvals Service listening on port 4009');
}
bootstrap();
