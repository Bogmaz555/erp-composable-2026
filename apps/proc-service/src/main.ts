import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    },
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.startAllMicroservices();
  const port = Number(process.env.PORT) || 4004;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`PROC-Service (Procurement) listening on http://${host}:${port} with NATS`);
}
bootstrap();
