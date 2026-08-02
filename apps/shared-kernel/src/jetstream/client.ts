import {
  connect,
  type ConnectionOptions,
  type JetStreamClient,
  type JetStreamManager,
  type JetStreamOptions,
  type NatsConnection,
} from 'nats';
import { resolveNatsUrl } from './flags';

export interface JetStreamHandles {
  nc: NatsConnection;
  js: JetStreamClient;
  jsm: JetStreamManager;
}

export interface ConnectJetStreamOptions {
  /** NATS server URL(s). Defaults to NATS_URL or nats://127.0.0.1:4222. */
  servers?: string | string[];
  /** Connect timeout ms (default 5000). */
  timeout?: number;
  /** Extra nats.connect options (name, token, etc.). */
  connectOpts?: Partial<ConnectionOptions>;
  /** JetStream API options (domain, timeout, apiPrefix). */
  jsOpts?: JetStreamOptions;
}

/**
 * Connect to NATS and return JetStream client + manager.
 * Caller owns lifecycle — call {@link closeJetStream} / `nc.close()` when done.
 */
export async function connectJetStream(
  options: ConnectJetStreamOptions = {},
): Promise<JetStreamHandles> {
  const servers = options.servers ?? resolveNatsUrl();
  const nc = await connect({
    servers,
    timeout: options.timeout ?? 5000,
    ...options.connectOpts,
  });

  const js = nc.jetstream(options.jsOpts);
  const jsm = await nc.jetstreamManager(options.jsOpts);
  return { nc, js, jsm };
}

/**
 * Close a NATS connection created by {@link connectJetStream}.
 * Safe to call with null/undefined.
 */
export async function closeJetStream(
  handles: Pick<JetStreamHandles, 'nc'> | NatsConnection | null | undefined,
): Promise<void> {
  if (!handles) return;
  const nc = 'nc' in handles ? handles.nc : handles;
  try {
    await nc.drain();
  } catch {
    try {
      await nc.close();
    } catch {
      // ignore close races
    }
  }
}
