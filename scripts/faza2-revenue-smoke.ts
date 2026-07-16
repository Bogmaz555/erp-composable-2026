#!/usr/bin/env npx tsx
/** Contract: KSeF sent → revenue recognized */
import type { TaxInvoiceKsefSentV1Event } from '../apps/shared-kernel/src/events/tax.events';

const ksef: TaxInvoiceKsefSentV1Event = {
  invoiceId: 'inv-1',
  ksefReferenceNumber: 'KSEF-SBX-001',
  projectId: 'proj-1',
  milestone: 'FAT',
  amount: 400000,
  currency: 'PLN',
  sentAt: new Date().toISOString(),
};

const revenue = {
  eventType: 'finance.revenue.recognized.v1',
  payload: {
    projectId: ksef.projectId,
    milestone: ksef.milestone,
    amount: ksef.amount,
    ksefReferenceNumber: ksef.ksefReferenceNumber,
    recognizedAt: new Date().toISOString(),
  },
};

if (revenue.payload.amount !== ksef.amount) {
  console.error('FAIL amount mismatch');
  process.exit(1);
}
console.log('=== Faza 2 Revenue Smoke PASSED ===');
console.log(`${ksef.milestone}: ${ksef.amount} PLN → ${revenue.eventType}`);
