/**
 * Canonical JetStream stream names and subject maps for Pilot v1 (KD-3 / design §3).
 *
 * Streams:
 *   ETO_CORE — PLM / PM / inventory / MES / finance.wip spine
 *   SUPPLY   — stock-out + procurement
 *   QUALITY  — quality + EAM
 *
 * Retention (pilot): limits, 7d max age, 1GB max bytes, file storage.
 * Outbox PROCESSED remains source of truth for “sent”; JS replay = recovery.
 */

/** Canonical stream name constants (also used by bootstrap + relay). */
export const STREAM_ETO_CORE = 'ETO_CORE' as const;
export const STREAM_SUPPLY = 'SUPPLY' as const;
export const STREAM_QUALITY = 'QUALITY' as const;

export type JetStreamName =
  | typeof STREAM_ETO_CORE
  | typeof STREAM_SUPPLY
  | typeof STREAM_QUALITY;

export const ALL_STREAM_NAMES: readonly JetStreamName[] = [
  STREAM_ETO_CORE,
  STREAM_SUPPLY,
  STREAM_QUALITY,
] as const;

/** Subject wildcards captured by each stream (NATS token wildcards). */
export const STREAM_SUBJECTS: Readonly<Record<JetStreamName, readonly string[]>> = {
  [STREAM_ETO_CORE]: [
    'plm.>',
    'pm.>',
    'inventory.>',
    'mes.>',
    'finance.wip.>',
  ],
  [STREAM_SUPPLY]: ['inv.stock.>', 'proc.>'],
  [STREAM_QUALITY]: ['quality.>', 'eam.>'],
};

/** Durable consumer names created by bootstrap (examples; PR 14 wires handlers). */
export interface DurableConsumerDef {
  stream: JetStreamName;
  durable: string;
  /** Optional single filter subject; omit for whole-stream pull. */
  filterSubject?: string;
  description?: string;
}

export const BOOTSTRAP_DURABLE_CONSUMERS: readonly DurableConsumerDef[] = [
  {
    stream: STREAM_ETO_CORE,
    durable: 'fin-wip-worker',
    filterSubject: 'finance.wip.>',
    description: 'Finance WIP record/reverse path',
  },
  {
    stream: STREAM_ETO_CORE,
    durable: 'inv-eto-worker',
    description: 'INV ETO spine (BOM release, material request, reservations)',
  },
  {
    stream: STREAM_ETO_CORE,
    durable: 'mes-eto-worker',
    filterSubject: 'mes.>',
    description: 'MES work-order / production path',
  },
  {
    stream: STREAM_SUPPLY,
    durable: 'proc-supply-worker',
    description: 'PROC supply chain (stock-out, PO events)',
  },
  {
    stream: STREAM_QUALITY,
    durable: 'quality-worker',
    description: 'Quality + EAM events',
  },
];

/** 7 days in milliseconds — used with nats `nanos()`. */
export const STREAM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Per-stream size cap (limits retention).
 * Kept at 256 MiB so ETO_CORE + SUPPLY + QUALITY fit under a 1 GiB
 * `jetstream.max_file` (infra/nats/nats.conf). Raise both together in prod.
 */
export const STREAM_MAX_BYTES = 256 * 1024 * 1024;

/**
 * Resolve which stream should capture a concrete event subject.
 * Longest-prefix / most-specific match among STREAM_SUBJECTS wildcards.
 *
 * Supports only trailing `>` (token rest) wildcards as used by our maps.
 */
export function resolveStreamForSubject(subject: string): JetStreamName | null {
  if (!subject || typeof subject !== 'string') return null;

  let best: { stream: JetStreamName; specificity: number } | null = null;

  for (const stream of ALL_STREAM_NAMES) {
    for (const pattern of STREAM_SUBJECTS[stream]) {
      if (!subjectMatchesPattern(subject, pattern)) continue;
      // Prefer more specific patterns (longer literal prefix before `>`).
      const specificity = pattern.replace(/>$/, '').length;
      if (!best || specificity > best.specificity) {
        best = { stream, specificity };
      }
    }
  }

  return best?.stream ?? null;
}

/**
 * Match a subject against a NATS wildcard pattern limited to trailing `>`
 * (e.g. `plm.>`, `finance.wip.>`). Full `*` token matching is not required
 * for current stream maps.
 */
export function subjectMatchesPattern(subject: string, pattern: string): boolean {
  if (pattern === '>') return true;
  if (pattern.endsWith('.>')) {
    // NATS `foo.>` matches foo.bar, foo.bar.baz — not bare `foo`.
    const prefix = pattern.slice(0, -2); // drop ".>"
    return subject.startsWith(prefix + '.');
  }
  if (pattern.endsWith('>')) {
    const prefix = pattern.slice(0, -1);
    return subject.startsWith(prefix);
  }
  return subject === pattern;
}

export interface StreamDefinition {
  name: JetStreamName;
  subjects: readonly string[];
  description: string;
  maxAgeMs: number;
  maxBytes: number;
}

export const STREAM_DEFINITIONS: readonly StreamDefinition[] = [
  {
    name: STREAM_ETO_CORE,
    subjects: STREAM_SUBJECTS[STREAM_ETO_CORE],
    description: 'ETO spine: PLM, PM, inventory, MES, finance.wip',
    maxAgeMs: STREAM_MAX_AGE_MS,
    maxBytes: STREAM_MAX_BYTES,
  },
  {
    name: STREAM_SUPPLY,
    subjects: STREAM_SUBJECTS[STREAM_SUPPLY],
    description: 'Supply: inv.stock + proc',
    maxAgeMs: STREAM_MAX_AGE_MS,
    maxBytes: STREAM_MAX_BYTES,
  },
  {
    name: STREAM_QUALITY,
    subjects: STREAM_SUBJECTS[STREAM_QUALITY],
    description: 'Quality + EAM',
    maxAgeMs: STREAM_MAX_AGE_MS,
    maxBytes: STREAM_MAX_BYTES,
  },
];
