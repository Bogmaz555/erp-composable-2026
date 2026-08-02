import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Mark Nest routes that skip JwtAuthGuard (e.g. /api/health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
