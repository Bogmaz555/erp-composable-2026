import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<any>(
    AppModule,
    new FastifyAdapter() as any
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
  });

  await app.listen(4006, '127.0.0.1');
  console.log('MES Service listening on port 4006');
}
bootstrap();
