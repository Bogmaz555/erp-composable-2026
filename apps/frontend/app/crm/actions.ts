'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Server actions call gateway with absolute URL.
 * Prefer GATEWAY_URL / NEXT_PUBLIC_GATEWAY_URL; default local enterprise port 4005.
 */
const API_GATEWAY_URL = (
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://127.0.0.1:4005'
).replace(/\/$/, '');

async function authHeaders(): Promise<HeadersInit> {
  const jar = await cookies();
  // Browser stores bearer in localStorage; server actions may not see it.
  // Prefer cookie if set by future middleware; else unauthenticated call fails honestly.
  const token = jar.get('erp-access-token')?.value;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function createOpportunity(data: {
  title: string;
  value: number;
  tkw: number;
  customerName: string;
}) {
  await fetch(`${API_GATEWAY_URL}/api/crm/opportunities`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  revalidatePath('/crm');
}

/** Accept opportunity (ACCEPTED) → CRM outbox crm.opportunity.won.v1 → PM project */
export async function acceptOpportunity(opportunityId: string) {
  const res = await fetch(`${API_GATEWAY_URL}/api/crm/pipeline`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ id: opportunityId, status: 'ACCEPTED' }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`acceptOpportunity failed HTTP ${res.status} ${text}`);
  }
  revalidatePath('/crm');
  revalidatePath('/pm');
  return res.json().catch(() => ({}));
}

export async function fetchOpportunities() {
  const res = await fetch(`${API_GATEWAY_URL}/api/crm`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_GATEWAY_URL}/api/pm`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}
