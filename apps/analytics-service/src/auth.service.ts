/**
 * ERP role matrix — mirrors Keycloak realm + @erp/shared-kernel roles module.
 * Keep labels/permissions here for UI; enforcement lives in shared-kernel + guards.
 */
import {
  CANONICAL_ERP_ROLES,
  ERP_ROLE_ALIASES,
  ETO_MUTATION_ROLES,
  expandRoles,
  type CanonicalErpRole,
} from '@erp/shared-kernel';

export const ERP_ROLES = [
  ...CANONICAL_ERP_ROLES,
  ...(Object.keys(ERP_ROLE_ALIASES) as (keyof typeof ERP_ROLE_ALIASES)[]),
] as const;

export type ErpRole = (typeof ERP_ROLES)[number];

export interface Permission {
  module: string;
  resource: string;
  actions: string[];
}

/** Static permission matrix for UI (dev + Keycloak parity). */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    { module: '*', resource: '*', actions: ['read', 'write', 'approve', 'delete'] },
  ],
  ENGINEER: [
    { module: 'PLM', resource: 'items|boms', actions: ['read', 'write'] },
    { module: 'PM', resource: 'projects|tasks', actions: ['read', 'write'] },
    { module: 'MES', resource: 'operations', actions: ['read', 'write'] },
    { module: 'Quality', resource: 'inspections|spc', actions: ['read', 'write'] },
    { module: 'EAM', resource: 'assets|workorders', actions: ['read', 'write'] },
  ],
  PRODUCTION_MANAGER: [
    { module: 'MES', resource: 'work-orders', actions: ['read', 'write'] },
    { module: 'PM', resource: 'projects|materials', actions: ['read', 'write'] },
    { module: 'INV', resource: 'stock|reservations', actions: ['read', 'write'] },
    { module: 'HR', resource: 'labor', actions: ['read', 'approve'] },
  ],
  PLANNER: [
    { module: 'PM', resource: 'projects|schedule', actions: ['read', 'write'] },
    { module: 'PROC', resource: 'orders|mrp', actions: ['read', 'write'] },
    { module: 'INV', resource: 'stock', actions: ['read', 'write'] },
  ],
  INSPECTOR: [
    { module: 'Quality', resource: 'inspections|ncr|capa|control-plans|spc', actions: ['read', 'write'] },
    { module: 'MES', resource: 'operations', actions: ['read'] },
  ],
  ACCOUNTANT: [
    { module: 'Finance', resource: 'gl|ar|ap|budget|wip', actions: ['read', 'write', 'approve'] },
    { module: 'Tax', resource: 'invoices|jpk', actions: ['read', 'write'] },
  ],
  PROCUREMENT: [
    { module: 'PROC', resource: 'orders|suppliers|mrp|landed-cost', actions: ['read', 'write', 'approve'] },
    { module: 'INV', resource: 'stock', actions: ['read', 'write'] },
  ],
  WAREHOUSE: [
    { module: 'INV', resource: 'stock|wms|lots|reservations', actions: ['read', 'write'] },
    { module: 'PROC', resource: 'orders', actions: ['read'] },
  ],
  MAINTENANCE: [
    { module: 'EAM', resource: 'assets|workorders', actions: ['read', 'write'] },
  ],
  SUPERVISOR: [
    { module: 'MES', resource: 'work-orders', actions: ['read', 'write'] },
  ],
  VIEWER: [
    { module: '*', resource: '*', actions: ['read'] },
  ],
};

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  activeRole: string;
  permissions: Permission[];
  authEnforced: boolean;
  keycloakReady: boolean;
}

export class AuthService {
  getRoles() {
    return {
      roles: CANONICAL_ERP_ROLES.map((id) => ({
        id,
        label: this.roleLabel(id),
        permissions: ROLE_PERMISSIONS[id] || [],
      })),
      aliases: ERP_ROLE_ALIASES,
      etoMutations: ETO_MUTATION_ROLES,
    };
  }

  getAuthReadiness() {
    const authEnforced = process.env.AUTH_ENFORCE !== 'false';
    const keycloakJwks = process.env.USE_KEYCLOAK_JWKS === 'true';
    const roleCount = CANONICAL_ERP_ROLES.length;
    const permissionEntries = Object.values(ROLE_PERMISSIONS).reduce(
      (n, perms) => n + perms.length,
      0,
    );
    const manufacturingRoles = ['ENGINEER', 'INSPECTOR', 'WAREHOUSE', 'PRODUCTION_MANAGER'];
    const hasManufacturingRbac = manufacturingRoles.every(
      (r) => (ROLE_PERMISSIONS[r]?.length ?? 0) > 0,
    );
    const etoMutationsCovered = Object.keys(ETO_MUTATION_ROLES).length >= 6;

    const ready =
      roleCount >= 8 && permissionEntries >= 10 && hasManufacturingRbac && etoMutationsCovered;
    let td001: 'yellow-minimum' | 'partial' | 'open-dev' = 'open-dev';
    if (ready && (authEnforced || keycloakJwks)) td001 = 'yellow-minimum';
    else if (ready) td001 = 'partial';

    return {
      ready,
      td001,
      authEnforced,
      keycloakJwks,
      roleCount,
      roles: [...CANONICAL_ERP_ROLES],
      aliases: { ...ERP_ROLE_ALIASES },
      etoMutations: Object.keys(ETO_MUTATION_ROLES),
      permissionEntries,
      protectedClusters: ['PLM', 'MES', 'PM', 'INV', 'PROC', 'FIN'],
      manufacturingGuards: hasManufacturingRbac,
      devMode: !authEnforced,
      endpoints: {
        roles: '/api/analytics/auth/roles',
        context: '/api/analytics/auth/context',
      },
      checkedAt: new Date().toISOString(),
    };
  }

  getContext(headers: Record<string, string | string[] | undefined>): AuthContext {
    const rolesHeader = headers['x-roles'] as string | undefined;
    const rawRoles = rolesHeader
      ? rolesHeader.split(',').map((r) => r.trim()).filter(Boolean)
      : ['VIEWER'];
    const roles = expandRoles(rawRoles);
    const activeRole = roles[0] || 'VIEWER';

    return {
      userId: (headers['x-user-id'] as string) || 'dev-user',
      email: (headers['x-user-email'] as string) || 'dev@erp.local',
      displayName: (headers['x-user-name'] as string) || 'Developer',
      roles: roles.length ? roles : [activeRole],
      activeRole,
      permissions: ROLE_PERMISSIONS[activeRole] || ROLE_PERMISSIONS.VIEWER,
      authEnforced: process.env.AUTH_ENFORCE !== 'false',
      keycloakReady: process.env.USE_KEYCLOAK_JWKS === 'true',
    };
  }

  private roleLabel(id: CanonicalErpRole | string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrator',
      ENGINEER: 'Inżynier / PLM',
      PRODUCTION_MANAGER: 'Kierownik produkcji',
      PLANNER: 'Planista',
      INSPECTOR: 'Inspektor jakości',
      ACCOUNTANT: 'Księgowy',
      PROCUREMENT: 'Zaopatrzenie',
      WAREHOUSE: 'Magazynier (alias → PRODUCTION_MANAGER)',
      MAINTENANCE: 'Utrzymanie ruchu (alias → ENGINEER)',
      SUPERVISOR: 'Brygadzista (alias → PRODUCTION_MANAGER)',
      VIEWER: 'Podgląd (read-only)',
    };
    return labels[id] || id;
  }
}
