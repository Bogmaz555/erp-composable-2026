import './tracing';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<any>(
    AppModule,
    (new FastifyAdapter() as any),
  );

  app.connectMicroservice({
    transport: Transport.NATS,
    options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
  } as MicroserviceOptions);

  app.enableCors({ origin: '*', credentials: true });

  await app.startAllMicroservices();
  await app.listen(4001, '0.0.0.0');
}
bootstrap();
