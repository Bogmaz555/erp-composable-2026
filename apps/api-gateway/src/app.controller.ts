import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller('api')
export class AppController {
  /** Public liveness — must stay reachable without bearer (pilot/k8s probes). */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
