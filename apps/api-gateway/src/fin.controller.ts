import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('api/fin')
@UseGuards(RolesGuard)
export class FinController {
  private readonly targetUrl = 'http://127.0.0.1:4010/fin';

  @All('*')
  @Roles('ACCOUNTANT', 'ADMIN')
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const url = `${this.targetUrl}${req.url.replace('/api/fin', '')}`;
    try {
      const response = await fetch(url, {
        method: req.method,
        headers: req.headers as unknown as HeadersInit,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });
      
      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error) {
      res.status(502).send({ statusCode: 502, message: 'Bad Gateway - Finance Service Down' });
    }
  }
}
