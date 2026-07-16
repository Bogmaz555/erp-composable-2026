import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller('api/mes')
@UseGuards(RolesGuard)
export class MesController {
  @All('*')
  @Roles('PRODUCTION', 'ENGINEER', 'ADMIN')  // Example role protection (Faza 1 auth foundation)
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const url = `http://127.0.0.1:4006${req.url.replace('/api/mes', '')}`;
    try {
      const response = await fetch(url, {
        method: req.method,
        headers: {
          ...req.headers,
          host: '127.0.0.1:4006',
        } as unknown as HeadersInit,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });

      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error) {
      res.status(502).send({ statusCode: 502, message: 'Bad Gateway - MES Service Down' });
    }
  }
}
