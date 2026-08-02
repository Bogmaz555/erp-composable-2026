/**
 * Enterprise Q2 — KSeF send + revenue recognition durable workflow.
 */

export interface KsefRevenueInput {
  tenantId: string;
  projectId: string;
  correlationId: string;
  amount: number;
  milestone?: string;
}

export interface KsefRevenueResult {
  ok: boolean;
  mode: 'temporal' | 'fallback';
  ksefReference?: string;
  revenueRecognized: boolean;
  correlationId: string;
  compensated?: boolean;
}

export function planKsefRevenue(_input: KsefRevenueInput): string[] {
  return ['send_ksef', 'recognize_revenue'];
}

export const KSEF_REVENUE_WORKFLOW = {
  name: 'ksefRevenueWorkflow',
  taskQueue: 'erp-ksef-revenue',
  version: '1.0.0',
};
