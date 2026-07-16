import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('api/quality')
@UseGuards(RolesGuard)
export class QualityController {
  private readonly targetBase = process.env.QUALITY_SERVICE_URL || 'http://127.0.0.1:4008';

  @All('*')
  @Roles('INSPECTOR', 'ENGINEER', 'ADMIN')
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const suffix = req.url.replace(/^\/api\/quality/, '') || '';
    const url = `${this.targetBase}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const text = await response.text();
    res.status(response.status).send(text);
  }
}
