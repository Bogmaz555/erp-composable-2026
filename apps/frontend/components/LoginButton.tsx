'use client';

import { useState } from 'react';
import { KeyRound, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TOKEN_KEY = 'erp-access-token';
const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080/realms/erp/protocol/openid-connect/auth';
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'erp-frontend';

export default function LoginButton() {
  const { authEnforced, displayName, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY);

  const loginKeycloak = () => {
    const redirect = encodeURIComponent(window.location.origin + '/');
    window.location.href = `${KEYCLOAK_URL}?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=token&scope=openid`;
  };

  const saveDevToken = () => {
    if (token.trim()) {
      localStorage.setItem(TOKEN_KEY, token.trim());
      setOpen(false);
      refresh();
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    refresh();
  };

  if (!authEnforced && !hasToken) {
    return (
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-300"
        title="Opcjonalny token Bearer (dev)"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Token
      </button>
    );
  }

  return (
    <div className="relative">
      {hasToken || !authEnforced ? (
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-green-500/30 text-green-300"
        >
          <LogOut className="w-3.5 h-3.5" />
          {displayName}
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
        <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-xl bg-zinc-900 border border-slate-700 shadow-xl z-50">
          <p className="text-xs text-slate-400 mb-2">Keycloak SSO lub token dev</p>
          <button type="button" onClick={loginKeycloak}
            className="w-full mb-2 px-3 py-2 bg-indigo-600 rounded-lg text-sm font-semibold">
            Keycloak Login
          </button>
          <input
            type="text"
            placeholder="Bearer token (dev)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-slate-700 rounded-lg text-xs mb-2"
          />
          <button type="button" onClick={saveDevToken}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg text-xs">
            Zapisz token
          </button>
        </div>
      )}
    </div>
  );
}
