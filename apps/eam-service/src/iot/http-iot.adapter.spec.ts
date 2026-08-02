import { HttpIotAdapter } from './http-iot.adapter';
import type { IotAlarm } from './iot-adapter';

describe('HttpIotAdapter (Q2)', () => {
  it('implements IotAdapter shape', () => {
    const adapter = new HttpIotAdapter({
      webhookUrl: 'http://127.0.0.1:9999/sink',
    });
    expect(adapter.name).toBe('http-webhook');
    expect(typeof adapter.connect).toBe('function');
    expect(typeof adapter.disconnect).toBe('function');
    expect(typeof adapter.publishTelemetry).toBe('function');
  });

  it('connect sets connected state for valid URL', async () => {
    const adapter = new HttpIotAdapter({
      webhookUrl: 'http://example.com/iot',
    });
    await adapter.connect();
    expect(adapter.getState()).toBe('connected');
    await adapter.disconnect();
    expect(adapter.getState()).toBe('disconnected');
  });

  it('rejects invalid URL on connect', async () => {
    const adapter = new HttpIotAdapter({ webhookUrl: 'not-a-url' });
    await expect(adapter.connect()).rejects.toThrow(/invalid webhook/);
    expect(adapter.getState()).toBe('error');
  });

  it('onAlarm delivers to handler', () => {
    const adapter = new HttpIotAdapter({
      webhookUrl: 'http://example.com/iot',
    });
    const received: IotAlarm[] = [];
    adapter.onAlarm((a) => received.push(a));
    adapter.emitAlarm({
      assetId: 'eq-1',
      severity: 'CRITICAL',
      code: 'TEMP_HIGH',
      message: 'overheat',
      detectedAt: new Date().toISOString(),
    });
    expect(received).toHaveLength(1);
    expect(received[0].code).toBe('TEMP_HIGH');
  });

  it('publishTelemetry posts JSON to webhook', async () => {
    const originalFetch = globalThis.fetch;
    const calls: unknown[] = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body });
      return { ok: true, status: 200 } as Response;
    }) as typeof fetch;

    try {
      const adapter = new HttpIotAdapter({
        webhookUrl: 'http://mock.local/iot',
      });
      await adapter.connect();
      await adapter.publishTelemetry('asset-42', { temp: 71.2 });
      expect(calls).toHaveLength(1);
      const body = JSON.parse((calls[0] as { body: string }).body);
      expect(body.assetId).toBe('asset-42');
      expect(body.payload.temp).toBe(71.2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
