import {
  headers as natsHeaders,
  StringCodec,
  type JetStreamClient,
  type JetStreamPublishOptions,
  type MsgHdrs,
  type PubAck,
} from 'nats';
import { resolveStreamForSubject } from './streams';

const sc = StringCodec();

export interface PublishWithAckOptions {
  /** Optional NATS-Msg-Id for server-side de-duplication within duplicate_window. */
  msgID?: string;
  /** Publish ack timeout (ms). */
  timeout?: number;
  /** Extra / tracing headers. */
  headers?: MsgHdrs | Record<string, string>;
  /**
   * When true (default), set expect.streamName from subject→stream map so the
   * server rejects publish if the subject is not bound to a known stream.
   */
  expectKnownStream?: boolean;
  /** Override expected stream name (e.g. tests). */
  expectStream?: string;
}

/**
 * Publish to JetStream and **await PubAck** (durable).
 * Prefer this over core `nc.publish` / Nest `emit` when NATS_JETSTREAM is on.
 */
export async function publishWithAck(
  js: JetStreamClient,
  subject: string,
  data: Uint8Array | string,
  options: PublishWithAckOptions = {},
): Promise<PubAck> {
  const payload =
    typeof data === 'string' ? sc.encode(data) : data;

  const opts = buildPublishOptions(subject, options);
  return js.publish(subject, payload, opts);
}

/**
 * JSON-encode payload and publish with JetStream ack.
 */
export async function publishJsonWithAck(
  js: JetStreamClient,
  subject: string,
  payload: unknown,
  options: PublishWithAckOptions = {},
): Promise<PubAck> {
  const body = sc.encode(JSON.stringify(payload ?? null));
  return publishWithAck(js, subject, body, options);
}

function buildPublishOptions(
  subject: string,
  options: PublishWithAckOptions,
): Partial<JetStreamPublishOptions> {
  const out: Partial<JetStreamPublishOptions> = {};

  if (options.msgID) out.msgID = options.msgID;
  if (options.timeout !== undefined) out.timeout = options.timeout;

  const hdrs = toMsgHdrs(options.headers);
  if (hdrs) out.headers = hdrs;

  const expectKnown = options.expectKnownStream !== false;
  const streamName =
    options.expectStream ??
    (expectKnown ? resolveStreamForSubject(subject) ?? undefined : undefined);

  if (streamName) {
    out.expect = { streamName };
  }

  return out;
}

function toMsgHdrs(
  input: MsgHdrs | Record<string, string> | undefined,
): MsgHdrs | undefined {
  if (!input) return undefined;
  // nats MsgHdrs has append/set/get — duck-type rather than instanceof
  if (typeof (input as MsgHdrs).append === 'function') {
    return input as MsgHdrs;
  }
  const hdrs = natsHeaders();
  for (const [k, v] of Object.entries(input as Record<string, string>)) {
    if (v !== undefined && v !== null) hdrs.set(k, String(v));
  }
  return hdrs;
}

export type { PubAck };
