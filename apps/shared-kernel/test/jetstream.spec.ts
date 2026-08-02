import {
  ALL_STREAM_NAMES,
  BOOTSTRAP_DURABLE_CONSUMERS,
  FIN_WIP_FILTER_SUBJECTS,
  assertEnterpriseMessaging,
  isEnterpriseProfile,
  isJetStreamEnabled,
  nestEventPatternDisabled,
  parseTruthyEnv,
  preferJetStreamConsumerPath,
  resolveNatsUrl,
  resolveStreamForSubject,
  STREAM_ETO_CORE,
  STREAM_QUALITY,
  STREAM_SUBJECTS,
  STREAM_SUPPLY,
  subjectMatchesPattern,
} from '../src/jetstream';

describe('JetStream kernel — flags', () => {
  it('isJetStreamEnabled is opt-in (default off)', () => {
    expect(isJetStreamEnabled({})).toBe(false);
    expect(isJetStreamEnabled({ NATS_JETSTREAM: '' })).toBe(false);
    expect(isJetStreamEnabled({ NATS_JETSTREAM: 'false' })).toBe(false);
  });

  it('accepts true/1/yes/on', () => {
    expect(parseTruthyEnv('true')).toBe(true);
    expect(parseTruthyEnv('1')).toBe(true);
    expect(parseTruthyEnv('YES')).toBe(true);
    expect(parseTruthyEnv('on')).toBe(true);
    expect(isJetStreamEnabled({ NATS_JETSTREAM: 'true' })).toBe(true);
  });

  it('resolveNatsUrl defaults', () => {
    expect(resolveNatsUrl({})).toBe('nats://127.0.0.1:4222');
    expect(resolveNatsUrl({ NATS_URL: 'nats://nats:4222' })).toBe('nats://nats:4222');
  });

  it('isEnterpriseProfile from ENTERPRISE or ERP_PROFILE=enterprise', () => {
    expect(isEnterpriseProfile({})).toBe(false);
    expect(isEnterpriseProfile({ ENTERPRISE: '1' })).toBe(true);
    expect(isEnterpriseProfile({ ENTERPRISE: 'true' })).toBe(true);
    expect(isEnterpriseProfile({ ERP_PROFILE: 'enterprise' })).toBe(true);
    expect(isEnterpriseProfile({ ERP_PROFILE: 'ENTERPRISE' })).toBe(true);
    expect(isEnterpriseProfile({ ERP_PROFILE: 'pilot' })).toBe(false);
  });

  it('assertEnterpriseMessaging no-ops when not enterprise', () => {
    expect(() => assertEnterpriseMessaging({})).not.toThrow();
    expect(() =>
      assertEnterpriseMessaging({ NATS_JETSTREAM: 'false' }),
    ).not.toThrow();
  });

  it('assertEnterpriseMessaging throws when enterprise without JetStream', () => {
    expect(() => assertEnterpriseMessaging({ ENTERPRISE: '1' })).toThrow(
      /NATS_JETSTREAM/,
    );
    expect(() =>
      assertEnterpriseMessaging({ ERP_PROFILE: 'enterprise', NATS_JETSTREAM: '' }),
    ).toThrow(/Enterprise profile requires NATS_JETSTREAM/);
  });

  it('assertEnterpriseMessaging ok when enterprise + JetStream', () => {
    expect(() =>
      assertEnterpriseMessaging({ ENTERPRISE: '1', NATS_JETSTREAM: 'true' }),
    ).not.toThrow();
    expect(() =>
      assertEnterpriseMessaging({
        ERP_PROFILE: 'enterprise',
        NATS_JETSTREAM: '1',
      }),
    ).not.toThrow();
  });
});

describe('JetStream kernel — stream map', () => {
  it('defines ETO_CORE / SUPPLY / QUALITY', () => {
    expect(ALL_STREAM_NAMES).toEqual([
      STREAM_ETO_CORE,
      STREAM_SUPPLY,
      STREAM_QUALITY,
    ]);
    expect(STREAM_SUBJECTS[STREAM_ETO_CORE]).toEqual(
      expect.arrayContaining(['plm.>', 'pm.>', 'inventory.>', 'mes.>', 'finance.wip.>']),
    );
    expect(STREAM_SUBJECTS[STREAM_SUPPLY]).toEqual(
      expect.arrayContaining(['inv.stock.>', 'proc.>']),
    );
    expect(STREAM_SUBJECTS[STREAM_QUALITY]).toEqual(
      expect.arrayContaining(['quality.>', 'eam.>']),
    );
  });

  it('subjectMatchesPattern handles trailing >', () => {
    expect(subjectMatchesPattern('plm.bom.released.v2', 'plm.>')).toBe(true);
    expect(subjectMatchesPattern('plm', 'plm.>')).toBe(false); // NATS: foo.> ≠ bare foo
    expect(subjectMatchesPattern('finance.wip.cost.recorded', 'finance.wip.>')).toBe(
      true,
    );
    expect(subjectMatchesPattern('finance.payment.x', 'finance.wip.>')).toBe(false);
    expect(subjectMatchesPattern('inv.stock.out.v1', 'inv.stock.>')).toBe(true);
  });

  it('resolveStreamForSubject maps ETO spine events', () => {
    expect(resolveStreamForSubject('plm.bom.released.v2')).toBe(STREAM_ETO_CORE);
    expect(resolveStreamForSubject('pm.material.requested.v1')).toBe(STREAM_ETO_CORE);
    expect(resolveStreamForSubject('inventory.reservation.created.v1')).toBe(
      STREAM_ETO_CORE,
    );
    expect(resolveStreamForSubject('inventory.reservation.released.v1')).toBe(
      STREAM_ETO_CORE,
    );
    expect(resolveStreamForSubject('mes.production.recorded.v1')).toBe(STREAM_ETO_CORE);
    expect(resolveStreamForSubject('finance.wip.cost.reversed')).toBe(STREAM_ETO_CORE);
  });

  it('resolveStreamForSubject maps SUPPLY and QUALITY', () => {
    expect(resolveStreamForSubject('inv.stock.out.v1')).toBe(STREAM_SUPPLY);
    expect(resolveStreamForSubject('proc.purchaseorder.approved.v1')).toBe(STREAM_SUPPLY);
    expect(resolveStreamForSubject('quality.ncr.raised.v1')).toBe(STREAM_QUALITY);
    expect(resolveStreamForSubject('eam.breakdown.detected.v1')).toBe(STREAM_QUALITY);
  });

  it('returns null for unknown subjects', () => {
    expect(resolveStreamForSubject('crm.opportunity.accepted.v1')).toBeNull();
    expect(resolveStreamForSubject('')).toBeNull();
  });

  it('bootstrap durables cover pilot workers', () => {
    const keys = BOOTSTRAP_DURABLE_CONSUMERS.map((c) => `${c.stream}/${c.durable}`);
    expect(keys).toEqual(
      expect.arrayContaining([
        'ETO_CORE/fin-wip-worker',
        'ETO_CORE/inv-eto-worker',
        'ETO_CORE/mes-eto-worker',
        'SUPPLY/proc-supply-worker',
        'QUALITY/quality-worker',
      ]),
    );
  });

  it('fin-wip-worker multi-filter covers WIP + reservation release + production', () => {
    const fin = BOOTSTRAP_DURABLE_CONSUMERS.find((c) => c.durable === 'fin-wip-worker');
    expect(fin?.filterSubjects).toEqual(
      expect.arrayContaining([
        'finance.wip.>',
        'inventory.reservation.released.v1',
        'mes.production.recorded.v1',
      ]),
    );
    expect(FIN_WIP_FILTER_SUBJECTS).toEqual(
      expect.arrayContaining(['finance.wip.>', 'inventory.reservation.released.v1']),
    );
  });
});

describe('JetStream kernel — single consumer path policy', () => {
  it('preferJetStreamConsumerPath follows NATS_JETSTREAM', () => {
    expect(preferJetStreamConsumerPath({})).toBe(false);
    expect(preferJetStreamConsumerPath({ NATS_JETSTREAM: 'true' })).toBe(true);
  });

  it('nestEventPatternDisabled only for migrated subjects when flag on', () => {
    expect(
      nestEventPatternDisabled('inventory.reservation.released.v1', {
        NATS_JETSTREAM: 'true',
      }),
    ).toBe(true);
    expect(
      nestEventPatternDisabled('plm.bom.released.v2', { NATS_JETSTREAM: 'true' }),
    ).toBe(true);
    expect(
      nestEventPatternDisabled('inventory.reservation.released.v1', {}),
    ).toBe(false);
    expect(
      nestEventPatternDisabled('proc.purchaseorder.approved.v1', {
        NATS_JETSTREAM: 'true',
      }),
    ).toBe(false);
  });
});

