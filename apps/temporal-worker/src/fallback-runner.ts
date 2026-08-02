/**
 * G-lite durable-equivalent runner when TEMPORAL_ADDRESS is unset.
 * Executes the same activity sequence as Temporal workflows.
 */
import {
  planEtoCompensation,
  type EtoCompensationInput,
  type EtoCompensationResult,
} from './workflows/eto-compensation.workflow';
import {
  planKsefRevenue,
  type KsefRevenueInput,
  type KsefRevenueResult,
} from './workflows/ksef-revenue.workflow';
import {
  reverseWipActivity,
  reverseRevenueActivity,
  ksefStatusActivity,
} from './activities/finance-activities';

export async function runEtoCompensationFallback(
  input: EtoCompensationInput,
): Promise<EtoCompensationResult> {
  const steps = planEtoCompensation(input);
  const executed: string[] = [];

  for (const step of steps) {
    if (step === 'reverse_wip') {
      await reverseWipActivity({
        tenantId: input.tenantId,
        projectId: input.projectId,
        correlationId: input.correlationId,
      });
      executed.push(step);
    } else if (step === 'release_reservation') {
      // INV owns reservation release — document step for matrix parity
      executed.push(step);
    } else if (step === 'reverse_revenue') {
      await reverseRevenueActivity({
        tenantId: input.tenantId,
        projectId: input.projectId,
        correlationId: input.correlationId,
      });
      executed.push(step);
    }
  }

  return {
    ok: true,
    mode: 'fallback',
    steps: executed,
    correlationId: input.correlationId,
  };
}

export async function runKsefRevenueFallback(
  input: KsefRevenueInput,
): Promise<KsefRevenueResult> {
  const steps = planKsefRevenue(input);
  const status = await ksefStatusActivity();
  // Sandbox/mock: mark revenue path as planned; live send is tax-legal event-driven
  return {
    ok: status.ready || status.mode === 'sandbox',
    mode: 'fallback',
    ksefReference: `FALLBACK-${input.correlationId.slice(0, 8)}`,
    revenueRecognized: steps.includes('recognize_revenue'),
    correlationId: input.correlationId,
  };
}

export function isTemporalConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !!(env.TEMPORAL_ADDRESS || env.TEMPORAL_HOST);
}
