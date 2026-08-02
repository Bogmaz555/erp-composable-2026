import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// TD-001: Downstream guard for INV — trusts Gateway claims (x-user-id, x-roles).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.AUTH_ENFORCE === 'false') return true;
    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      const headers = request.headers || {};
      const userId = headers['x-user-id'];
      const rolesRaw = headers['x-roles'];
      if (userId) {
        const roles =
          typeof rolesRaw === 'string'
            ? rolesRaw.split(',').map((r: string) => r.trim()).filter(Boolean)
            : Array.isArray(rolesRaw)
              ? rolesRaw
              : [];
        request.user = { id: userId, roles };
      }
    }
    return !!request.user && request.user.id !== 'invalid-token';
  }
}
