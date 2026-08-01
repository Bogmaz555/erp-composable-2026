import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { userHasAnyRole } from '@erp/shared-kernel';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.AUTH_ENFORCE === 'false') return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

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
    return userHasAnyRole(request.user?.roles, requiredRoles);
  }
}
