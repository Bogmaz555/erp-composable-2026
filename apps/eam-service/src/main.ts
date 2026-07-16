import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { EamModule } from './eam.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    EamModule,
    new FastifyAdapter()
  );

  app.enableCors({ origin: 'http://localhost:3000' });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: ['nats://localhost:4222'],
      queue: 'eam_queue',
    },
  });

  await app.startAllMicroservices();
  await app.listen(4009, '0.0.0.0');
  console.log(`EAM Service is running on http://127.0.0.1:4009`);
}
bootstrap();
