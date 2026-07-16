import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { HrModule } from './hr.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(HrModule, new FastifyAdapter());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
  });

  app.enableCors({ origin: '*' });
  await app.startAllMicroservices();
  await app.listen(4012, '0.0.0.0');
  console.log('HR Service http://localhost:4012');
}
bootstrap();
