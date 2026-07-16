import { Controller, Sse } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';

@Controller()
export class AppController {
  private eventStream = new Subject<{ data: any }>();
  private messageBuffer: number[] = [];
  private activeServicesSet = new Set<string>();

  // Wildcard listener
  @EventPattern('>')
  handleAllEvents(@Payload() data: any, @Ctx() context: NatsContext) {
    const subject = context.getSubject();
    const now = Date.now();
    this.messageBuffer.push(now);

    const serviceName = subject.split('.')[0] || 'unknown';
    this.activeServicesSet.add(serviceName);

    // Czyszczenie starych wiadomości (starszych niż sekunda) z bufora
    this.messageBuffer = this.messageBuffer.filter(t => now - t <= 1000);
    const messagesPerSec = this.messageBuffer.length;

    const payload = {
      type: 'TELEMETRY_STATS',
      mps: messagesPerSec,
      activeServices: this.activeServicesSet.size,
      timestamp: new Date().toISOString(),
      service: serviceName.toUpperCase(),
      eventType: subject
    };

    // Emit event to SSE clients
    this.eventStream.next({ data: payload });
  }

  @Sse('stream')
  streamEvents(): Observable<{ data: any }> {
    return this.eventStream.asObservable();
  }
}
