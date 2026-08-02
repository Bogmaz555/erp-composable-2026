import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<any>(
    AppModule,
    new FastifyAdapter() as any,
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  const port = Number(process.env.PORT) || 4006;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`MES Service listening on http://${host}:${port}`);
}
bootstrap();
