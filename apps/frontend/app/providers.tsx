'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { TenantProvider } from '../context/TenantContext';

/**
 * Centralny provider TanStack Query dla całej aplikacji ERP.
 * Konfiguracja:
 * - staleTime: 30s — dane traktowane jako świeże przez 30s (redukcja zbędnych refetchów)
 * - gcTime: 5min — niewykorzystane query zachowywane w cache przez 5 minut
 * - retry: 2 — automatyczne ponowienie przy błędach sieciowych
 * - refetchOnWindowFocus: false — zapobiega niechcianym refetchom przy alt-tab
 * Devtools widoczne tylko w trybie development.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </TenantProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
