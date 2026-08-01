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
  const port = Number(process.env.PORT) || 4015;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`TaxLegalPBC http://${host}:${port}`);
}
bootstrap();
