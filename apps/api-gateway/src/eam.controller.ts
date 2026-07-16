import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('api/eam')
@UseGuards(RolesGuard)
export class EamController {
  private readonly targetUrl = 'http://127.0.0.1:4009/eam';

  @All('*')
  @Roles('MAINTENANCE', 'ENGINEER', 'ADMIN')
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const url = `${this.targetUrl}${req.url.replace('/api/eam', '')}`;
    try {
      const response = await fetch(url, {
        method: req.method,
        headers: req.headers as unknown as HeadersInit,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });
      
      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error) {
      res.status(502).send({ statusCode: 502, message: 'Bad Gateway - EAM Service Down' });
    }
  }
}
