/**
 * Enterprise Q2 — real IoT adapter interface for EAM.
 * Concrete adapters implement connect/publish; optional alarm subscription.
 */

export interface IotAlarm {
  assetId: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  code: string;
  message: string;
  detectedAt: string;
  raw?: Record<string, unknown>;
}

export interface IotAdapter {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publishTelemetry(
    assetId: string,
    payload: Record<string, unknown>,
  ): Promise<void>;
  onAlarm?(handler: (alarm: IotAlarm) => void): void;
}

export type IotConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
