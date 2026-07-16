import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('api/proc')
@UseGuards(RolesGuard)
export class ProcController {
  private readonly targetBase = process.env.PROC_SERVICE_URL || 'http://127.0.0.1:4004';

  @All('*')
  @Roles('PROCUREMENT', 'ADMIN', 'PLANNER')
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const suffix = req.url.replace(/^\/api\/proc/, '') || '';
    const url = `${this.targetBase}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
    try {
      const response = await fetch(url, {
        method: req.method,
        headers: req.headers as unknown as HeadersInit,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });
      const data = await response.text();
      res.status(response.status).send(data);
    } catch {
      res.status(502).send({ statusCode: 502, message: 'Bad Gateway - Procurement Service Down' });
    }
  }
}
