import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// TD-001: JWT Auth Guard
// Protects routes. In future: Combine with RolesGuard for RBAC.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // JWT is enabled by default. Only bypass if explicitly disabled via AUTH_DISABLE.
    if (process.env.AUTH_DISABLE === 'true') {
      console.warn('SECURITY WARNING: JWT Auth is globally disabled (AUTH_DISABLE=true)');
      return true;
    }
    return super.canActivate(context);
  }
}
