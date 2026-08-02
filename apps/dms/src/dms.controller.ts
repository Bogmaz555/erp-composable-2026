import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';

/**
 * Enterprise Q4 — versioned DMS API (in-memory + schema contract when DB unavailable).
 * Full Prisma wiring uses Document / DocumentVersion models.
 */
type DocRec = {
  id: string;
  tenantId: string;
  fileName: string;
  projectId?: string;
  entityRef?: string;
  currentVersion: number;
  versions: { version: number; storageKey: string; sha256?: string; createdBy?: string }[];
};

const store = new Map<string, DocRec>();

@Controller()
export class DmsController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'dms', q4: true };
  }

  @Get('documents')
  list(
    @Query('projectId') projectId?: string,
    @Query('entityRef') entityRef?: string,
  ) {
    let rows = [...store.values()];
    if (projectId) rows = rows.filter((d) => d.projectId === projectId);
    if (entityRef) rows = rows.filter((d) => d.entityRef === entityRef);
    return { documents: rows };
  }

  @Post('documents')
  create(
    @Body()
    body: {
      fileName: string;
      projectId?: string;
      entityRef?: string;
      tenantId?: string;
      contentBase64?: string;
      createdBy?: string;
    },
  ) {
    const id = randomUUID();
    const storageKey = `dms/${id}/v1`;
    const sha =
      body.contentBase64 &&
      createHash('sha256').update(Buffer.from(body.contentBase64, 'base64')).digest('hex');
    const rec: DocRec = {
      id,
      tenantId: body.tenantId || 'default',
      fileName: body.fileName || 'untitled',
      projectId: body.projectId,
      entityRef: body.entityRef,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          storageKey,
          sha256: sha || undefined,
          createdBy: body.createdBy,
        },
      ],
    };
    store.set(id, rec);
    return rec;
  }

  @Post('documents/:id/versions')
  addVersion(
    @Param('id') id: string,
    @Body() body: { contentBase64?: string; createdBy?: string },
  ) {
    const rec = store.get(id);
    if (!rec) return { error: 'not_found' };
    const version = rec.currentVersion + 1;
    const storageKey = `dms/${id}/v${version}`;
    const sha =
      body.contentBase64 &&
      createHash('sha256').update(Buffer.from(body.contentBase64, 'base64')).digest('hex');
    rec.currentVersion = version;
    rec.versions.push({
      version,
      storageKey,
      sha256: sha || undefined,
      createdBy: body.createdBy,
    });
    return rec;
  }

  @Get('documents/:id')
  get(@Param('id') id: string) {
    return store.get(id) || { error: 'not_found' };
  }
}
