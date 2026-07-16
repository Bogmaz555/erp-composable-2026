import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// TD-001: JWT Auth Guard
// Protects routes. In future: Combine with RolesGuard for RBAC.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Dev/test bypass: only enforce JWT when explicitly enabled.
    if (process.env.AUTH_ENFORCE !== 'true') return true;
    return super.canActivate(context);
  }
}
