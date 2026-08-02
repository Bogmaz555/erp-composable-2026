import {
  AckPolicy,
  DeliverPolicy,
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
  nanos,
  type ConsumerConfig,
  type JetStreamManager,
  type NatsConnection,
} from 'nats';
import {
  BOOTSTRAP_DURABLE_CONSUMERS,
  STREAM_DEFINITIONS,
  type JetStreamName,
} from './streams';

export interface EnsureStreamsResult {
  created: JetStreamName[];
  existing: JetStreamName[];
  updated: JetStreamName[];
  consumersCreated: string[];
  consumersExisting: string[];
}

export interface EnsureStreamsOptions {
  /** Also create durable pull consumers from BOOTSTRAP_DURABLE_CONSUMERS (default true). */
  ensureConsumers?: boolean;
  /** Logger sink (default console). */
  log?: (msg: string) => void;
}

/**
 * Idempotent stream (+ optional durable consumer) bootstrap for Pilot v1.
 * Safe to re-run: existing streams get subjects/limits updated when needed;
 * existing durables are left in place.
 */
export async function ensurePilotStreams(
  jsm: JetStreamManager,
  options: EnsureStreamsOptions = {},
): Promise<EnsureStreamsResult> {
  const log = options.log ?? ((m: string) => console.log(m));
  const ensureConsumers = options.ensureConsumers !== false;

  const result: EnsureStreamsResult = {
    created: [],
    existing: [],
    updated: [],
    consumersCreated: [],
    consumersExisting: [],
  };

  for (const def of STREAM_DEFINITIONS) {
    const cfg = {
      name: def.name,
      subjects: [...def.subjects],
      description: def.description,
      retention: RetentionPolicy.Limits,
      storage: StorageType.File,
      discard: DiscardPolicy.Old,
      max_age: nanos(def.maxAgeMs),
      max_bytes: def.maxBytes,
      num_replicas: 1,
      duplicate_window: nanos(120_000), // 2m de-dupe window for msgID
    };

    let info: { config: { subjects?: string[] } } | null = null;
    try {
      info = await jsm.streams.info(def.name);
    } catch {
      info = null;
    }

    if (!info) {
      await jsm.streams.add(cfg);
      result.created.push(def.name);
      log(`[jetstream] stream created: ${def.name} subjects=${def.subjects.join(',')}`);
    } else {
      result.existing.push(def.name);
      // Ensure subjects cover the pilot map; refresh limits/description when possible.
      const currentSubjects = info.config.subjects ?? [];
      const current = new Set(currentSubjects);
      const missing = def.subjects.filter((s) => !current.has(s));
      if (missing.length === 0) {
        log(`[jetstream] stream ok: ${def.name}`);
      } else {
        try {
          await jsm.streams.update(def.name, {
            subjects: [...new Set([...currentSubjects, ...def.subjects])],
            description: def.description,
            max_age: nanos(def.maxAgeMs),
            max_bytes: def.maxBytes,
            discard: DiscardPolicy.Old,
          });
          result.updated.push(def.name);
          log(
            `[jetstream] stream updated: ${def.name} added subjects=${missing.join(',')}`,
          );
        } catch (e) {
          // Non-fatal: stream already exists (subjects may still cover traffic).
          log(
            `[jetstream] stream update skipped/failed for ${def.name}: ${(e as Error).message}`,
          );
        }
      }
    }
  }

  if (ensureConsumers) {
    for (const c of BOOTSTRAP_DURABLE_CONSUMERS) {
      const key = `${c.stream}/${c.durable}`;
      let info: { config: Partial<ConsumerConfig> } | null = null;
      try {
        info = await jsm.consumers.info(c.stream, c.durable);
      } catch {
        info = null;
      }

      const consumerCfg: Partial<ConsumerConfig> = {
        durable_name: c.durable,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        description: c.description,
        // Pull consumer (no deliver_subject) — workers fetch via JetStream pull API.
      };
      // filter_subject XOR filter_subjects (nats server)
      if (c.filterSubjects && c.filterSubjects.length > 0) {
        consumerCfg.filter_subjects = [...c.filterSubjects];
      } else if (c.filterSubject) {
        consumerCfg.filter_subject = c.filterSubject;
      }

      if (!info) {
        await jsm.consumers.add(c.stream, consumerCfg);
        result.consumersCreated.push(key);
        log(`[jetstream] consumer created: ${key}`);
        continue;
      }

      // Existing durable: leave in place unless multi-filter list is missing subjects
      // (PR14 fin-wip expanded from finance.wip.> only → + reservation + production).
      if (c.filterSubjects && c.filterSubjects.length > 0) {
        const current =
          info.config.filter_subjects ??
          (info.config.filter_subject ? [info.config.filter_subject] : []);
        const missing = c.filterSubjects.filter((s) => !current.includes(s));
        if (missing.length > 0) {
          try {
            // Server may reject filter changes in-place; delete + re-add durable.
            await jsm.consumers.delete(c.stream, c.durable);
            await jsm.consumers.add(c.stream, consumerCfg);
            result.consumersCreated.push(key);
            log(
              `[jetstream] consumer recreated: ${key} added filters=${missing.join(',')}`,
            );
            continue;
          } catch (e) {
            log(
              `[jetstream] consumer filter update failed for ${key}: ${(e as Error).message}`,
            );
          }
        }
      }

      result.consumersExisting.push(key);
      log(`[jetstream] consumer ok: ${key}`);
    }
  }

  return result;
}

/**
 * Convenience: connect via existing NatsConnection, ensure streams, leave conn open.
 */
export async function ensurePilotStreamsOnConnection(
  nc: NatsConnection,
  options: EnsureStreamsOptions = {},
): Promise<EnsureStreamsResult> {
  const jsm = await nc.jetstreamManager();
  return ensurePilotStreams(jsm, options);
}
