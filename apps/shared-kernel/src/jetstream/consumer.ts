/**
 * Durable JetStream pull-consumer loop for Pilot v1 single consumer path.
 *
 * Prefer this over Nest `@EventPattern` for subjects migrated under
 * `NATS_JETSTREAM=true` (see consumer-path.ts). Never dual-subscribe Nest + JS
 * for the same subject.
 */
import {
  StringCodec,
  type ConsumerMessages,
  type JetStreamClient,
  type JsMsg,
} from 'nats';

const sc = StringCodec();

export interface DurableMessage {
  subject: string;
  /** Parsed JSON body when possible; otherwise raw string. */
  data: unknown;
  headers: Record<string, string>;
  /** Outbox / NATS-Msg-Id when publisher set msgID. */
  msgId?: string;
  raw: JsMsg;
}

export type DurableMessageHandler = (msg: DurableMessage) => Promise<void>;

export interface RunDurablePullOptions {
  js: JetStreamClient;
  stream: string;
  durable: string;
  handler: DurableMessageHandler;
  /** Stop the loop when aborted. */
  signal?: AbortSignal;
  /** Max messages per fetch (default 8). */
  batch?: number;
  /** Fetch expires ms (default 5000). */
  expiresMs?: number;
  /** Called on handler errors after nak (optional). */
  onError?: (err: unknown, msg: DurableMessage) => void;
  log?: (msg: string) => void;
}

/**
 * Pull messages from an existing durable consumer until aborted or connection ends.
 * Acks on success; naks on handler throw (redelivery).
 */
export async function runDurablePullLoop(
  options: RunDurablePullOptions,
): Promise<void> {
  const {
    js,
    stream,
    durable,
    handler,
    signal,
    batch = 8,
    expiresMs = 5000,
    onError,
    log = () => undefined,
  } = options;

  const consumer = await js.consumers.get(stream, durable);
  log(`[jetstream] pull loop start ${stream}/${durable}`);

  while (!signal?.aborted) {
    let messages: ConsumerMessages;
    try {
      messages = await consumer.fetch({
        max_messages: batch,
        expires: expiresMs,
      });
    } catch (e) {
      if (signal?.aborted) return;
      // Brief backoff on fetch errors (server restart, etc.)
      log(
        `[jetstream] fetch error ${stream}/${durable}: ${(e as Error).message}`,
      );
      await sleep(500);
      continue;
    }

    for await (const m of messages) {
      if (signal?.aborted) {
        try {
          m.nak();
        } catch {
          /* ignore */
        }
        return;
      }

      const parsed = parseJsMsg(m);
      try {
        await handler(parsed);
        m.ack();
      } catch (err) {
        onError?.(err, parsed);
        try {
          m.nak();
        } catch {
          /* ignore */
        }
      }
    }
  }

  log(`[jetstream] pull loop stop ${stream}/${durable}`);
}

export function parseJsMsg(m: JsMsg): DurableMessage {
  const rawStr = sc.decode(m.data);
  let data: unknown = rawStr;
  try {
    data = JSON.parse(rawStr);
  } catch {
    // leave as string
  }

  const headers: Record<string, string> = {};
  if (m.headers) {
    try {
      // nats MsgHdrs is iterable as [key, values[]]
      for (const entry of m.headers as unknown as Iterable<[string, string[]]>) {
        const k = entry[0];
        const vals = entry[1];
        if (vals && vals[0] !== undefined) headers[k] = String(vals[0]);
      }
    } catch {
      // best-effort header extract
    }
  }

  // msgID may appear as Nats-Msg-Id header when publisher set options.msgID
  const msgId =
    headers['Nats-Msg-Id'] ||
    headers['nats-msg-id'] ||
    headers['NATS-Msg-Id'] ||
    undefined;

  return {
    subject: m.subject,
    data,
    headers,
    msgId,
    raw: m,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
