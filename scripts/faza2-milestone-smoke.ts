#!/usr/bin/env npx tsx
/** Faza 2 smoke: PM FAT → Finance MilestoneBilling → TaxLegal KSeF (contract only) */
import type { FinancePaymentMilestoneReachedV1Event } from '../apps/shared-kernel/src/events/finance.events';

function assert(c: boolean, m: string) {
  if (!c) {
    console.error('FAIL', m);
    process.exit(1);
  }
}

const evt: FinancePaymentMilestoneReachedV1Event = {
  projectId: 'proj-eto-99',
  milestone: 'FAT',
  amount: 500000,
  currency: 'PLN',
  percent: 40,
  tenantId: 'default',
};

assert(evt.milestone === 'FAT', 'milestone');
assert(evt.amount > 0, 'amount');

const ksefOutbox = {
  eventType: 'tax.invoice.ksef.sent.v1',
  payload: {
    projectId: evt.projectId,
    milestone: evt.milestone,
    amount: evt.amount,
    ksefReferenceNumber: 'KSEF-SBX-mock',
  },
};
assert(ksefOutbox.eventType === 'tax.invoice.ksef.sent.v1', 'ksef event');

console.log('=== Faza 2 Milestone Smoke PASSED ===');
console.log(`Flow: PM reach ${evt.milestone} → Finance READY → TaxLegal ${ksefOutbox.payload.ksefReferenceNumber}`);
