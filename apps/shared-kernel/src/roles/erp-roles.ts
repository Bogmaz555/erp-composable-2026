/**
 * ERP role matrix — single source of truth for pilot RBAC.
 *
 * Canonical roles = Keycloak realm `infra/keycloak/realm-erp.json`.
 * Aliases (WAREHOUSE / MAINTENANCE / SUPERVISOR) appear in legacy guards
 * and expand to canonical roles via {@link expandRoles}.
 */

/** Realm roles from infra/keycloak/realm-erp.json */
export const CANONICAL_ERP_ROLES = [
  'ADMIN',
  'ENGINEER',
  'PRODUCTION_MANAGER',
  'PLANNER',
  'PROCUREMENT',
  'ACCOUNTANT',
  'INSPECTOR',
  'VIEWER',
] as const;

export type CanonicalErpRole = (typeof CANONICAL_ERP_ROLES)[number];

/**
 * Non-canonical role names used in code → canonical equivalents.
 * - WAREHOUSE: INV write path (maps to PRODUCTION_MANAGER for manufacturing spine)
 * - MAINTENANCE: EAM path (maps to ENGINEER)
 * - SUPERVISOR: MES shop-floor (maps to PRODUCTION_MANAGER)
 */
export const ERP_ROLE_ALIASES: Readonly<Record<string, readonly CanonicalErpRole[]>> = {
  WAREHOUSE: ['PRODUCTION_MANAGER'],
  MAINTENANCE: ['ENGINEER'],
  SUPERVISOR: ['PRODUCTION_MANAGER'],
} as const;

/** All recognized role strings (canonical + alias keys). */
export const ALL_ERP_ROLES = [
  ...CANONICAL_ERP_ROLES,
  ...(Object.keys(ERP_ROLE_ALIASES) as (keyof typeof ERP_ROLE_ALIASES)[]),
] as const;

/**
 * Writer roles per critical ETO mutation (VIEWER never listed).
 * ADMIN is implicit superuser via {@link userHasAnyRole}.
 */
export const ETO_MUTATION_ROLES = {
  /** PLM BOM release */
  PLM_BOM_RELEASE: ['ENGINEER', 'PRODUCTION_MANAGER'] as const,
  /** PM material request / project structure writes */
  PM_MATERIAL_REQUEST: ['ENGINEER', 'PLANNER', 'PRODUCTION_MANAGER'] as const,
  /** INV reserve / stock mutation HTTP paths */
  INV_RESERVE: ['WAREHOUSE', 'PRODUCTION_MANAGER', 'PROCUREMENT', 'PLANNER'] as const,
  /** PROC PO approve/reject */
  PROC_APPROVE: ['PROCUREMENT'] as const,
  /** FIN journal / WIP write HTTP paths */
  FIN_WIP_WRITE: ['ACCOUNTANT'] as const,
  /** MES start / finish production */
  MES_START: ['PRODUCTION_MANAGER', 'SUPERVISOR'] as const,
} as const;

export type EtoMutation = keyof typeof ETO_MUTATION_ROLES;

/** Human-readable writer documentation for smokes / ops. */
export const ETO_MUTATION_WRITER_DOCS: Record<
  EtoMutation,
  { path: string; writers: readonly string[]; notes: string }
> = {
  PLM_BOM_RELEASE: {
    path: 'PATCH /bom-versions/:id/release',
    writers: ['ENGINEER', 'PRODUCTION_MANAGER', 'ADMIN'],
    notes: 'VIEWER denied; SUPERVISOR not sufficient',
  },
  PM_MATERIAL_REQUEST: {
    path: 'POST /projects/:id/tasks/:taskId/materials',
    writers: ['ENGINEER', 'PLANNER', 'PRODUCTION_MANAGER', 'ADMIN'],
    notes: 'VIEWER denied',
  },
  INV_RESERVE: {
    path: 'POST /inventory/stock/adjust | simulate/plm-bom-released',
    writers: ['WAREHOUSE', 'PRODUCTION_MANAGER', 'PROCUREMENT', 'PLANNER', 'ADMIN'],
    notes: 'WAREHOUSE alias expands to PRODUCTION_MANAGER',
  },
  PROC_APPROVE: {
    path: 'PATCH /orders/:id/approve',
    writers: ['PROCUREMENT', 'ADMIN'],
    notes: 'VIEWER denied; PLANNER gateway-read only unless dual-roled',
  },
  FIN_WIP_WRITE: {
    path: 'POST /fin/journal',
    writers: ['ACCOUNTANT', 'ADMIN'],
    notes: 'VIEWER denied; event-driven WIP still audited via x-roles headers',
  },
  MES_START: {
    path: 'PATCH /work-orders/:id/start|finish',
    writers: ['PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN'],
    notes: 'SUPERVISOR alias expands to PRODUCTION_MANAGER',
  },
};

/** Expand a role list: keep originals + map aliases to canonical. */
export function expandRoles(roles: readonly string[] | undefined | null): string[] {
  if (!roles?.length) return [];
  const out = new Set<string>();
  for (const raw of roles) {
    const role = String(raw).trim();
    if (!role) continue;
    out.add(role);
    const mapped = ERP_ROLE_ALIASES[role];
    if (mapped) {
      for (const c of mapped) out.add(c);
    }
  }
  return [...out];
}

/** Normalize comma-separated or array roles from JWT / x-roles. */
export function parseRolesHeader(
  value: string | string[] | undefined | null,
): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v) => parseRolesHeader(v));
  }
  return value
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

/**
 * True if the user may perform an action requiring any of `requiredRoles`.
 * ADMIN always passes. Aliases on the user side are expanded before match.
 */
export function userHasAnyRole(
  userRoles: readonly string[] | undefined | null,
  requiredRoles: readonly string[] | undefined | null,
): boolean {
  if (!requiredRoles?.length) return true;
  const expanded = expandRoles(userRoles);
  if (expanded.includes('ADMIN')) return true;
  const requiredExpanded = expandRoles(requiredRoles);
  return requiredExpanded.some((r) => expanded.includes(r));
}

/** Convenience: can this user perform a named ETO mutation? */
export function canPerformEtoMutation(
  userRoles: readonly string[] | undefined | null,
  mutation: EtoMutation,
): boolean {
  return userHasAnyRole(userRoles, ETO_MUTATION_ROLES[mutation]);
}

/** VIEWER (and empty) must never pass writer checks. */
export function isViewerOnly(userRoles: readonly string[] | undefined | null): boolean {
  const expanded = expandRoles(userRoles);
  if (!expanded.length) return true;
  if (expanded.includes('ADMIN')) return false;
  return expanded.every((r) => r === 'VIEWER');
}
