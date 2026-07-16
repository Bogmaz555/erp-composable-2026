import { Controller, Sse, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { PlatformService } from './platform.service';
import { ApprovalService } from './approval.service';
import { EtoChainService } from './eto-chain.service';

interface MessageEvent {
  data: string | object;
}

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
  private eventStream = new Subject<any>();
  private readonly bufferSize = 100;
  private eventBuffer: any[] = [];

  // Aggregated counters for production observability
  private readonly eventCounters = new Map<string, number>();
  private readonly serviceCounters = new Map<string, number>();
  private totalEvents = 0;
  private readonly startedAt = new Date();

  // Track messages per second
  private messageCount = 0;
  private currentMps = 0;

  constructor(
    private readonly platform: PlatformService,
    private readonly approvals: ApprovalService,
    private readonly etoChain: EtoChainService,
  ) {
    this.platform.setApprovalIngest((subject, payload) => this.approvals.ingestFromEvent(subject, payload));
    // Calculate MPS every second
    setInterval(() => {
      this.currentMps = this.messageCount;
      this.messageCount = 0;
      
      // Push MPS update to stream
      this.eventStream.next({
        type: 'TELEMETRY_STATS',
        mps: this.currentMps,
        activeServices: this.calculateActiveServices()
      });
    }, 1000);
  }

  private calculateActiveServices() {
    const services = new Set(this.eventBuffer.map(e => e.service).filter(Boolean));
    return services.size;
  }

  @EventPattern('>')
  async handleAllEvents(@Payload() data: any, @Ctx() context: NatsContext) {
    this.messageCount++;
    const subject = context.getSubject();
    
    // Extract service name from subject if possible (e.g., 'procurement.order.approved' -> 'procurement')
    const serviceName = subject.split('.')[0] || 'unknown';

    // Aggregate counters (production observability)
    this.totalEvents++;
    this.eventCounters.set(subject, (this.eventCounters.get(subject) || 0) + 1);
    this.serviceCounters.set(serviceName, (this.serviceCounters.get(serviceName) || 0) + 1);

    const eventPayload = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      subject: subject,
      payload: data
    };

    // Keep buffer rolling
    this.eventBuffer.push(eventPayload);
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer.shift();
    }

    this.platform.recordEvent(subject, serviceName, data);
    this.etoChain.ingestEvent(subject, data);

    // Push to SSE stream
    this.eventStream.next({
      type: 'NATS_EVENT',
      ...eventPayload
    });
  }

  @Sse('stream')
  streamEvents(): Observable<MessageEvent> {
    return this.eventStream.asObservable().pipe(
      map(data => ({ data }))
    );
  }

  /** Aggregated event counters for the observability dashboard. */
  @Get('counters')
  getCounters() {
    const byEvent = [...this.eventCounters.entries()]
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count);

    const byService = [...this.serviceCounters.entries()]
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    const uptimeSec = Math.round((Date.now() - this.startedAt.getTime()) / 1000);

    return {
      totalEvents: this.totalEvents,
      currentMps: this.currentMps,
      uptimeSec,
      activeServices: this.serviceCounters.size,
      byService,
      byEvent,
    };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', totalEvents: this.totalEvents };
  }
}
