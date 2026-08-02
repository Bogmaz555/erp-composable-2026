'use client';

import { useEffect, useState } from 'react';
import { KeyRound, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TOKEN_KEY = 'erp-access-token';
const KEYCLOAK_AUTH =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL ||
  'http://localhost:8080/realms/erp/protocol/openid-connect/auth';
const KEYCLOAK_TOKEN =
  process.env.NEXT_PUBLIC_KEYCLOAK_TOKEN_URL ||
  'http://localhost:8080/realms/erp/protocol/openid-connect/token';
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'erp-frontend';

export default function LoginButton() {
  const { authEnforced, displayName, authenticated, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('demo.admin');
  const [password, setPassword] = useState('demo123');
  const [devToken, setDevToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Avoid SSR/client mismatch: only read localStorage after mount. */
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasToken(!!localStorage.getItem(TOKEN_KEY));
  }, [authenticated]);

  // Until mounted, render the same tree as SSR (logged-out chrome).
  const loggedIn = mounted && (authenticated || hasToken);

  const loginPassword = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        username: username.trim(),
        password,
        scope: 'openid',
      });
      const res = await fetch(KEYCLOAK_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await res.json().catch(() => ({} as Record<string, string>));
      if (!res.ok || !data.access_token) {
        throw new Error(
          data.error_description ||
            data.error ||
            `Logowanie nieudane (HTTP ${res.status})`,
        );
      }
      localStorage.setItem(TOKEN_KEY, data.access_token as string);
      setHasToken(true);
      setOpen(false);
      await refresh();
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd logowania');
    } finally {
      setBusy(false);
    }
  };

  const loginKeycloak = () => {
    const redirect = encodeURIComponent(window.location.origin + '/');
    window.location.href = `${KEYCLOAK_AUTH}?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=token&scope=openid`;
  };

  const saveDevToken = async () => {
    if (!devToken.trim()) return;
    localStorage.setItem(TOKEN_KEY, devToken.trim());
    setHasToken(true);
    setOpen(false);
    await refresh();
    window.location.reload();
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('erp-dev-role');
    setHasToken(false);
    await refresh();
    setOpen(false);
    window.location.href = '/';
  };

  return (
    <div className="relative">
      {loggedIn ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-green-500/30 text-green-300"
          title="Konto / wyloguj"
        >
          <LogOut className="w-3.5 h-3.5" />
          {displayName && displayName !== 'Unauthenticated'
            ? displayName
            : 'Zalogowany'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
        >
          <LogIn className="w-3.5 h-3.5" />
          Zaloguj
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 p-4 rounded-xl bg-zinc-900 border border-slate-700 shadow-xl z-50">
          {loggedIn ? (
            <>
              <p className="text-xs text-slate-400 mb-3">
                Zalogowany jako{' '}
                <span className="text-slate-200">{displayName}</span>
                {authEnforced ? ' · API wymaga JWT' : ''}
              </p>
              <button
                type="button"
                onClick={logout}
                className="w-full px-3 py-2 bg-rose-600/90 hover:bg-rose-500 rounded-lg text-sm font-semibold text-white"
              >
                Wyloguj i wyczyść token
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-3">
                Logowanie lokalne (Keycloak password grant). Demo:{' '}
                <code className="text-indigo-300">demo.admin / demo123</code>
              </p>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Użytkownik
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-slate-700 rounded-lg text-xs mb-2 text-white"
                autoComplete="username"
              />
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loginPassword()}
                className="w-full px-3 py-2 bg-zinc-950 border border-slate-700 rounded-lg text-xs mb-3 text-white"
                autoComplete="current-password"
              />
              {error && (
                <p className="text-xs text-rose-400 mb-2 break-words">{error}</p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={loginPassword}
                className="w-full mb-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Zaloguj (demo)
              </button>
              <button
                type="button"
                onClick={loginKeycloak}
                className="w-full mb-3 px-3 py-2 border border-slate-600 hover:border-indigo-500/50 rounded-lg text-xs text-slate-300"
              >
                Keycloak SSO (przekierowanie)
              </button>
              <div className="border-t border-slate-800 pt-3">
                <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Token dev (opcjonalnie)
                </p>
                <input
                  type="text"
                  placeholder="wklej access_token"
                  value={devToken}
                  onChange={(e) => setDevToken(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-slate-700 rounded-lg text-xs mb-2"
                />
                <button
                  type="button"
                  onClick={saveDevToken}
                  className="w-full px-3 py-2 border border-slate-600 rounded-lg text-xs"
                >
                  Zapisz token
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
