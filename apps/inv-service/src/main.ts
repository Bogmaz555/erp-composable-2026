import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

  app.connectMicroservice({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.PORT) || 4003;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  console.log(`INV-Service listening on http://${host}:${port} with NATS`);
}
bootstrap();
