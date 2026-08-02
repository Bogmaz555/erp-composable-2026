/**
 * Activity implementations — HTTP/NATS side effects for Temporal or G-lite fallback.
 */

const FIN_URL = () =>
  process.env.FINANCE_SERVICE_URL || 'http://127.0.0.1:4010';
const TAX_URL = () =>
  process.env.TAX_LEGAL_URL || 'http://127.0.0.1:4015';

export async function reverseWipActivity(input: {
  tenantId: string;
  projectId: string;
  correlationId: string;
}): Promise<{ ok: boolean; detail?: unknown }> {
  try {
    const res = await fetch(`${FIN_URL()}/fin/compensations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forwardEvent: 'finance.wip.cost.recorded',
        tenantId: input.tenantId,
        projectId: input.projectId,
        correlationId: input.correlationId,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const detail = await res.json().catch(() => ({}));
    return { ok: res.ok, detail };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

export async function reverseRevenueActivity(input: {
  tenantId: string;
  projectId: string;
  correlationId: string;
  amount?: number;
}): Promise<{ ok: boolean; detail?: unknown }> {
  try {
    const res = await fetch(`${FIN_URL()}/fin/compensations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forwardEvent: 'finance.revenue.recognized.v1',
        tenantId: input.tenantId,
        projectId: input.projectId,
        correlationId: input.correlationId,
        amount: input.amount,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const detail = await res.json().catch(() => ({}));
    return { ok: res.ok, detail };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

export async function releaseCommitmentActivity(input: {
  tenantId: string;
  correlationId: string;
  orderRef?: string;
  amount?: number;
}): Promise<{ ok: boolean; detail?: unknown }> {
  try {
    const res = await fetch(`${FIN_URL()}/fin/compensations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forwardEvent: 'proc.purchaseorder.approved.v1',
        tenantId: input.tenantId,
        correlationId: input.correlationId,
        orderRef: input.orderRef,
        amount: input.amount,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const detail = await res.json().catch(() => ({}));
    return { ok: res.ok, detail };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

export async function ksefStatusActivity(): Promise<{
  mode: string;
  ready: boolean;
}> {
  try {
    const res = await fetch(`${TAX_URL()}/tax-legal/ksef/status`, {
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.json()) as { mode?: string; ready?: boolean };
    return { mode: body.mode || 'unknown', ready: !!body.ready };
  } catch {
    return { mode: 'unreachable', ready: false };
  }
}
