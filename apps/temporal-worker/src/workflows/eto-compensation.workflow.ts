/**
 * Enterprise Q2 — durable ETO fail-step compensation workflow.
 * Activities are injected by the worker; this file is workflow-sandbox safe
 * when used with Temporal SDK (proxyActivities). Fallback runner invokes activities directly.
 */

export interface EtoCompensationInput {
  tenantId: string;
  projectId: string;
  correlationId: string;
  failedStep?: string;
  /** When true, also reverse revenue if recognized */
  reverseRevenue?: boolean;
}

export interface EtoCompensationResult {
  ok: boolean;
  mode: 'temporal' | 'fallback';
  steps: string[];
  correlationId: string;
}

/** Pure step plan — unit-testable without Temporal runtime */
export function planEtoCompensation(input: EtoCompensationInput): string[] {
  const steps = ['reverse_wip', 'release_reservation'];
  if (input.reverseRevenue) steps.push('reverse_revenue');
  return steps;
}

/**
 * Workflow definition metadata (not executed by Temporal without worker bootstrap).
 * Live Temporal uses this task queue when TEMPORAL_ADDRESS is set.
 */
export const ETO_COMPENSATION_WORKFLOW = {
  name: 'etoCompensationWorkflow',
  taskQueue: 'erp-eto-compensation',
  version: '1.0.0',
};
