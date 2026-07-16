import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

// Placeholder for subscribing to cross-module events if needed in future
@Injectable()
export class PlmNatsListener implements OnModuleInit {
  constructor(@Inject('NATS_SERVICE') private readonly client: ClientProxy) {}

  onModuleInit() {
    // Example: this.client.emit or subscribe patterns will be added when integrating with other clusters
    console.log('[PLM] NATS listener ready for future integrations');
  }
}
