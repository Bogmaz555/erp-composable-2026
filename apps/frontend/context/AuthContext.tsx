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
  authenticated: boolean;
  setActiveRole: (role: ErpRole) => void;
  can: (action: string, resource?: string) => boolean;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'erp-dev-role';
const TOKEN_KEY = 'erp-access-token';

/** Unauthenticated UI shape — never privilege-elevate on soft-fail. */
const UNAUTH_CTX: Partial<AuthContextValue> = {
  userId: '',
  email: '',
  displayName: 'Unauthenticated',
  roles: [],
  permissions: [],
  authEnforced: true,
  authenticated: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<ErpRole>('VIEWER');
  const [ctx, setCtx] = useState<Partial<AuthContextValue>>({ ...UNAUTH_CTX });

  const refresh = useCallback(async () => {
    const role = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as ErpRole | null;
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch('/api/analytics/auth/context', { headers });
    } catch {
      // Network error — do not retain privileged defaults.
      setCtx({ ...UNAUTH_CTX });
      setActiveRoleState('VIEWER');
      return;
    }

    if (res.status === 401 || res.status === 403) {
      if (token && typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      setCtx({ ...UNAUTH_CTX, authEnforced: true, authenticated: false });
      setActiveRoleState('VIEWER');
      return;
    }

    if (!res.ok) {
      setCtx({ ...UNAUTH_CTX });
      setActiveRoleState('VIEWER');
      return;
    }

    const data = await res.json();
    const roles: ErpRole[] = Array.isArray(data.roles) ? data.roles : [];
    setCtx({
      userId: data.userId ?? '',
      email: data.email ?? '',
      displayName: data.displayName ?? data.email ?? data.userId ?? 'User',
      roles,
      permissions: data.permissions ?? [],
      authEnforced: data.authEnforced ?? true,
      authenticated: true,
    });
    if (role && roles.includes(role)) setActiveRoleState(role);
    else if (data.activeRole && roles.includes(data.activeRole)) setActiveRoleState(data.activeRole);
    else if (roles.length > 0) setActiveRoleState(roles[0]);
    else setActiveRoleState('VIEWER');
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
    userId: ctx.userId ?? '',
    email: ctx.email ?? '',
    displayName: ctx.displayName ?? 'Unauthenticated',
    activeRole,
    roles: ctx.roles ?? [],
    permissions: ctx.permissions ?? [],
    authEnforced: ctx.authEnforced ?? true,
    authenticated: ctx.authenticated === true && !!(ctx.userId || (ctx.roles && ctx.roles.length)),
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

/** Read stored Keycloak / dev bearer token (if any). */
export function getAccessToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

/** Headers with Authorization: Bearer when token is present. */
export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

/** Fetch z Bearer token (Keycloak / dev). Required for former public analytics routes. */
export function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit) {
  const headers = authHeaders(init?.headers);
  return fetch(input, { ...init, headers });
}
