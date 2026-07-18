import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { TaxLegalModule } from './tax-legal.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    TaxLegalModule,
    new FastifyAdapter(),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
  });

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });
  await app.startAllMicroservices();
  await app.listen(4015, '127.0.0.1');
  console.log('TaxLegalPBC http://localhost:4015');
}
bootstrap();
