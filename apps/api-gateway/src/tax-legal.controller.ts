import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('api/tax-legal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxLegalController {
  @All('*')
  @Roles('ACCOUNTANT', 'ADMIN')
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const path = req.url.replace(/^\/api\/tax-legal/, '') || '/tax-legal/health';
    const url = `http://127.0.0.1:4015${path.startsWith('/tax-legal') ? path : `/tax-legal${path}`}`;
    try {
      const response = await fetch(url, {
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:4015' } as unknown as HeadersInit,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });
      res.status(response.status).send(await response.text());
    } catch {
      res.status(502).send({ statusCode: 502, message: 'TaxLegalPBC unavailable' });
    }
  }
}
