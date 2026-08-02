import { Logger } from '@nestjs/common';
import type { IotAdapter, IotAlarm, IotConnectionState } from './iot-adapter';

/**
 * HTTP webhook IoT adapter — posts telemetry to configurable webhook URL.
 * Suitable for edge gateways and mock servers in tests.
 */
export class HttpIotAdapter implements IotAdapter {
  readonly name = 'http-webhook';
  private readonly logger = new Logger(HttpIotAdapter.name);
  private state: IotConnectionState = 'disconnected';
  private alarmHandler?: (alarm: IotAlarm) => void;
  private readonly webhookUrl: string;
  private readonly timeoutMs: number;

  constructor(opts?: { webhookUrl?: string; timeoutMs?: number }) {
    this.webhookUrl =
      opts?.webhookUrl ||
      process.env.EAM_IOT_WEBHOOK_URL ||
      'http://127.0.0.1:9/iot-sink'; // invalid port default — connect validates
    this.timeoutMs = opts?.timeoutMs ?? 5000;
  }

  getState(): IotConnectionState {
    return this.state;
  }

  async connect(): Promise<void> {
    this.state = 'connecting';
    // Lightweight readiness: URL must be absolute http(s)
    if (!/^https?:\/\//i.test(this.webhookUrl)) {
      this.state = 'error';
      throw new Error(`HttpIotAdapter: invalid webhook URL ${this.webhookUrl}`);
    }
    this.state = 'connected';
    this.logger.log(`HttpIotAdapter connected → ${this.webhookUrl}`);
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
    this.logger.log('HttpIotAdapter disconnected');
  }

  async publishTelemetry(
    assetId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (this.state !== 'connected') {
      await this.connect();
    }
    const body = {
      assetId,
      payload,
      source: this.name,
      publishedAt: new Date().toISOString(),
    };
    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(
        `HttpIotAdapter telemetry HTTP ${res.status} asset=${assetId}`,
      );
    }
  }

  onAlarm(handler: (alarm: IotAlarm) => void): void {
    this.alarmHandler = handler;
  }

  /** Test / edge inject: deliver alarm to registered handler */
  emitAlarm(alarm: IotAlarm): void {
    this.alarmHandler?.(alarm);
  }
}
