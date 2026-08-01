import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isAuthDisabled } from './auth-env';

// TD-001: JWT Auth Guard
// Protects Nest routes. Secure-by-default; only AUTH_DISABLE=true or AUTH_ENFORCE=false bypass.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (isAuthDisabled()) {
      console.warn(
        `SECURITY WARNING: JWT Auth bypassed (` +
          (process.env.AUTH_DISABLE === 'true'
            ? 'AUTH_DISABLE=true'
            : 'AUTH_ENFORCE=false') +
          `)`,
      );
      return true;
    }
    return super.canActivate(context);
  }
}
