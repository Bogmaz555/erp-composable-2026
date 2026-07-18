import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Włączenie CORS (dla pewności komunikacji wewnątrz klastra)
    app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

    // Szyna zdarzeń NATS
    app.connectMicroservice({
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      },
    });

    // Uruchomienie listenerów mikroserwisów (NATS) pobocznie z HTTP
    await app.startAllMicroservices();

    // ⚡ TWARDE WPIĘCIE: Serce magazynu bije zawsze na porcie 4003
    await app.listen(4003, '127.0.0.1');

    console.log('📦 Zasilanie Magazynu (INV-Service) włączone na porcie 4003 z nasłuchem NATS');
}
bootstrap();