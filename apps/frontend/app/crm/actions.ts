'use server'

import { revalidatePath } from 'next/cache';

const API_GATEWAY_URL = 'http://localhost:4000';

export async function createOpportunity(data: { title: string, value: number, tkw: number, customerName: string }) {
  await fetch(`${API_GATEWAY_URL}/api/crm/opportunities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  revalidatePath('/crm');
}

export async function acceptOpportunity(opportunityId: string) {
  await fetch(`${API_GATEWAY_URL}/api/crm/opportunities/${opportunityId}/pipeline`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED' })
  });

  revalidatePath('/crm');
  revalidatePath('/pm');
}

export async function fetchOpportunities() {
  const res = await fetch(`${API_GATEWAY_URL}/api/crm/opportunities`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_GATEWAY_URL}/api/pm/projects`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}
