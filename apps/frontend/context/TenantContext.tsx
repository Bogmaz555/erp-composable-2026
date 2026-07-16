"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface Tenant {
  id: string;
  name: string;
  nip?: string;
  currency: string;
  isActive: boolean;
}

interface TenantContextValue {
  tenantId: string;
  tenant: Tenant | null;
  tenants: Tenant[];
  setTenantId: (id: string) => void;
  refresh: () => Promise<void>;
}

const TenantCtx = createContext<TenantContextValue | null>(null);
const STORAGE_KEY = 'erp-tenant-id';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState('default');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const refresh = useCallback(async () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const res = await fetch('/api/analytics/tenants', {
      headers: stored ? { 'X-Tenant-Id': stored } : {},
    });
    if (!res.ok) return;
    const data = await res.json();
    const list: Tenant[] = data.active ?? data.tenants ?? [];
    setTenants(list);
    const activeId = stored && list.some((t) => t.id === stored) ? stored : list[0]?.id ?? 'default';
    setTenantIdState(activeId);
    setTenant(list.find((t) => t.id === activeId) ?? null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTenantIdState(stored);
    refresh();
  }, [refresh]);

  const setTenantId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setTenantIdState(id);
    setTenant(tenants.find((t) => t.id === id) ?? null);
  };

  return (
    <TenantCtx.Provider value={{ tenantId, tenant, tenants, setTenantId, refresh }}>
      {children}
    </TenantCtx.Provider>
  );
}

export function useTenant() {
  const v = useContext(TenantCtx);
  if (!v) throw new Error('useTenant must be used within TenantProvider');
  return v;
}

/** Fetch z propagacją X-Tenant-Id */
export function fetchWithTenant(input: RequestInfo | URL, init?: RequestInit) {
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) ?? 'default' : 'default';
  const headers = new Headers(init?.headers);
  headers.set('X-Tenant-Id', tenantId);
  return fetch(input, { ...init, headers });
}
