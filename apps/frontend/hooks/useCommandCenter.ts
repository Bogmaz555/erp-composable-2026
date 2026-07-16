import { useQuery } from '@tanstack/react-query';

export interface ServiceProbe {
  name: string;
  port: number;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  httpCode: number;
  latencyMs: number;
  layer: 'direct' | 'gateway';
}

export interface CommandCenterData {
  generatedAt: string;
  summary: {
    total: number;
    up: number;
    degraded: number;
    down: number;
    healthScore: number;
    regressionScore: number | null;
  };
  services: ServiceProbe[];
  regression: {
    generatedAt?: string;
    passed?: number;
    failed?: number;
    total?: number;
    score?: number;
  } | null;
}

export function useCommandCenter() {
  return useQuery<CommandCenterData>({
    queryKey: ['command-center'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/command-center');
      if (!res.ok) throw new Error('Command Center unavailable');
      return res.json();
    },
    refetchInterval: 20000,
    staleTime: 10000,
  });
}
