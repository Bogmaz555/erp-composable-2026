/** ERP role matrix — mirrors Keycloak realm roles + gateway RolesGuard. */
export const ERP_ROLES = [
  'ADMIN',
  'ENGINEER',
  'INSPECTOR',
  'ACCOUNTANT',
  'PROCUREMENT',
  'WAREHOUSE',
  'VIEWER',
] as const;

export type ErpRole = (typeof ERP_ROLES)[number];

export interface Permission {
  module: string;
  resource: string;
  actions: string[];
}

/** Static permission matrix for UI (dev + Keycloak parity). */
export const ROLE_PERMISSIONS: Record<ErpRole, Permission[]> = {
  ADMIN: [
    { module: '*', resource: '*', actions: ['read', 'write', 'approve', 'delete'] },
  ],
  ENGINEER: [
    { module: 'PLM', resource: 'items|boms', actions: ['read', 'write'] },
    { module: 'PM', resource: 'projects|tasks', actions: ['read', 'write'] },
    { module: 'MES', resource: 'operations', actions: ['read', 'write'] },
    { module: 'Quality', resource: 'inspections|spc', actions: ['read', 'write'] },
  ],
  INSPECTOR: [
    { module: 'Quality', resource: 'inspections|ncr|capa|control-plans|spc', actions: ['read', 'write'] },
    { module: 'MES', resource: 'operations', actions: ['read'] },
  ],
  ACCOUNTANT: [
    { module: 'Finance', resource: 'gl|ar|ap|budget', actions: ['read', 'write', 'approve'] },
    { module: 'Tax', resource: 'invoices|jpk', actions: ['read', 'write'] },
  ],
  PROCUREMENT: [
    { module: 'PROC', resource: 'orders|suppliers|mrp|landed-cost', actions: ['read', 'write', 'approve'] },
    { module: 'INV', resource: 'stock', actions: ['read'] },
  ],
  WAREHOUSE: [
    { module: 'INV', resource: 'stock|wms|lots', actions: ['read', 'write'] },
    { module: 'PROC', resource: 'orders', actions: ['read'] },
  ],
  VIEWER: [
    { module: '*', resource: '*', actions: ['read'] },
  ],
};

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  roles: ErpRole[];
  activeRole: ErpRole;
  permissions: Permission[];
  authEnforced: boolean;
  keycloakReady: boolean;
}

export class AuthService {
  getRoles() {
    return {
      roles: ERP_ROLES.map((id) => ({
        id,
        label: this.roleLabel(id),
        permissions: ROLE_PERMISSIONS[id],
      })),
    };
  }

  getAuthReadiness() {
    const authEnforced = process.env.AUTH_ENFORCE === 'true';
    const keycloakJwks = process.env.USE_KEYCLOAK_JWKS === 'true';
    const roleCount = ERP_ROLES.length;
    const permissionEntries = Object.values(ROLE_PERMISSIONS).reduce(
      (n, perms) => n + perms.length,
      0,
    );
    const manufacturingRoles = ['ENGINEER', 'INSPECTOR', 'WAREHOUSE'] as ErpRole[];
    const hasManufacturingRbac = manufacturingRoles.every((r) => ROLE_PERMISSIONS[r]?.length > 0);

    const ready = roleCount >= 7 && permissionEntries >= 10 && hasManufacturingRbac;
    let td001: 'yellow-minimum' | 'partial' | 'open-dev' = 'open-dev';
    if (ready && (authEnforced || keycloakJwks)) td001 = 'yellow-minimum';
    else if (ready) td001 = 'partial';

    return {
      ready,
      td001,
      authEnforced,
      keycloakJwks,
      roleCount,
      roles: [...ERP_ROLES],
      permissionEntries,
      protectedClusters: ['PLM', 'MES', 'PM', 'INV'],
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
    const devRole = (headers['x-dev-role'] as string) || 'ADMIN';
    const activeRole = ERP_ROLES.includes(devRole as ErpRole) ? (devRole as ErpRole) : 'ADMIN';
    const rolesHeader = headers['x-roles'] as string | undefined;
    const roles: ErpRole[] = rolesHeader
      ? rolesHeader.split(',').filter((r): r is ErpRole => ERP_ROLES.includes(r as ErpRole))
      : [activeRole];

    return {
      userId: (headers['x-user-id'] as string) || 'dev-user',
      email: (headers['x-user-email'] as string) || 'dev@erp.local',
      displayName: (headers['x-user-name'] as string) || 'Developer',
      roles: roles.length ? roles : [activeRole],
      activeRole,
      permissions: ROLE_PERMISSIONS[activeRole],
      authEnforced: process.env.AUTH_ENFORCE === 'true',
      keycloakReady: process.env.USE_KEYCLOAK_JWKS === 'true',
    };
  }

  private roleLabel(id: ErpRole): string {
    const labels: Record<ErpRole, string> = {
      ADMIN: 'Administrator',
      ENGINEER: 'Inżynier / PLM',
      INSPECTOR: 'Inspektor jakości',
      ACCOUNTANT: 'Księgowy',
      PROCUREMENT: 'Zaopatrzenie',
      WAREHOUSE: 'Magazynier',
      VIEWER: 'Podgląd (read-only)',
    };
    return labels[id];
  }
}
