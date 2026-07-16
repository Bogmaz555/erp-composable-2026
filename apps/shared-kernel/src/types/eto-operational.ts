/** Minimalne pola traceability ETO na eventach operacyjnych */
export interface EtoOperationalContext {
  projectId: string;
  tenantId?: string;
  wbsElementId?: string;
  bomComponentId?: string;
}

export function assertEtoOperationalPayload(
  payload: Record<string, unknown>,
  label: string,
): EtoOperationalContext {
  const projectId = String(payload.projectId || '');
  if (!projectId) {
    throw new Error(`[ETO] ${label}: missing projectId`);
  }
  const hasWbs = Boolean(payload.wbsElementId);
  const hasBom = Boolean(payload.bomComponentId);
  if (!hasWbs && !hasBom && label.includes('material')) {
    throw new Error(`[ETO] ${label}: require wbsElementId or bomComponentId`);
  }
  return {
    projectId,
    tenantId: payload.tenantId ? String(payload.tenantId) : 'default',
    wbsElementId: payload.wbsElementId ? String(payload.wbsElementId) : undefined,
    bomComponentId: payload.bomComponentId ? String(payload.bomComponentId) : undefined,
  };
}
