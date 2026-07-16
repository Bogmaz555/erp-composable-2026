/** Resolve tenant from request headers (gateway propagates X-Tenant-Id). */
export function resolveTenantId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-tenant-id'];
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id && id !== 'public' ? id : 'default';
}
