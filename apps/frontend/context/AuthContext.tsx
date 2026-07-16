"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type ErpRole = 'ADMIN' | 'ENGINEER' | 'INSPECTOR' | 'ACCOUNTANT' | 'PROCUREMENT' | 'WAREHOUSE' | 'VIEWER';

export interface Permission {
  module: string;
  resource: string;
  actions: string[];
}

export interface AuthContextValue {
  userId: string;
  email: string;
  displayName: string;
  activeRole: ErpRole;
  roles: ErpRole[];
  permissions: Permission[];
  authEnforced: boolean;
  setActiveRole: (role: ErpRole) => void;
  can: (action: string, resource?: string) => boolean;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'erp-dev-role';
const TOKEN_KEY = 'erp-access-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<ErpRole>('ADMIN');
  const [ctx, setCtx] = useState<Partial<AuthContextValue>>({
    userId: 'dev-user',
    email: 'dev@erp.local',
    displayName: 'Developer',
    roles: ['ADMIN'],
    permissions: [],
    authEnforced: false,
  });

  const refresh = useCallback(async () => {
    const role = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as ErpRole | null;
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const headers: Record<string, string> = {};
    if (role) headers['X-Dev-Role'] = role;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/analytics/auth/context', { headers });
    if (!res.ok) return;
    const data = await res.json();
    setCtx({
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      roles: data.roles,
      permissions: data.permissions,
      authEnforced: data.authEnforced,
    });
    if (role && data.roles?.includes(role)) setActiveRoleState(role);
    else setActiveRoleState(data.activeRole);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ErpRole | null;
    if (stored) setActiveRoleState(stored);

    // Keycloak implicit flow — token w hash URL (#access_token=...)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get('access_token');
      if (accessToken) {
        localStorage.setItem(TOKEN_KEY, accessToken);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }

    refresh();
  }, [refresh]);

  const setActiveRole = (role: ErpRole) => {
    localStorage.setItem(STORAGE_KEY, role);
    setActiveRoleState(role);
    refresh();
  };

  const can = (action: string, resource = '*') => {
    const perms = ctx.permissions ?? [];
    return perms.some(
      (p) =>
        (p.module === '*' || p.resource === '*' || p.resource.includes(resource)) &&
        p.actions.includes(action),
    );
  };

  const value: AuthContextValue = {
    userId: ctx.userId ?? 'dev-user',
    email: ctx.email ?? 'dev@erp.local',
    displayName: ctx.displayName ?? 'Developer',
    activeRole,
    roles: ctx.roles ?? [activeRole],
    permissions: ctx.permissions ?? [],
    authEnforced: ctx.authEnforced ?? false,
    setActiveRole,
    can,
    refresh,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

/** Fetch z Bearer token (Keycloak / dev). */
export function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
