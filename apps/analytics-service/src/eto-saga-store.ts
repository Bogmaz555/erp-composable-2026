import * as fs from 'fs';
import * as path from 'path';
import type { EtoSagaState, EtoSagaStatus } from './eto-chain.service';
import type { PrismaService } from './prisma.service';

const STORE_PATH = path.join(process.cwd(), '.agents', 'swarm', 'eto-sagas.json');
const ALT_PATH = path.join(process.cwd(), '..', '..', '.agents', 'swarm', 'eto-sagas.json');

function resolveJsonPath(): string {
  if (fs.existsSync(path.dirname(STORE_PATH))) return STORE_PATH;
  return ALT_PATH;
}

export function loadSagasFromJson(): Map<string, EtoSagaState> {
  const map = new Map<string, EtoSagaState>();
  const p = resolveJsonPath();
  try {
    if (!fs.existsSync(p)) return map;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as EtoSagaState[];
    for (const s of raw) map.set(s.correlationId, s);
  } catch { /* fresh start */ }
  return map;
}

export function saveSagasToJson(sagas: Map<string, EtoSagaState>) {
  const p = resolveJsonPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify([...sagas.values()], null, 2));
}

export async function loadSagasFromDb(prisma: PrismaService): Promise<Map<string, EtoSagaState>> {
  const map = new Map<string, EtoSagaState>();
  try {
    const rows = await prisma.etoSaga.findMany({ orderBy: { lastEventAt: 'desc' } });
    for (const row of rows) {
      map.set(row.correlationId, {
        correlationId: row.correlationId,
        projectId: row.projectId,
        status: (row.status ?? 'ACTIVE') as EtoSagaStatus,
        completedSteps: row.completedSteps,
        lastEventAt: row.lastEventAt.toISOString(),
        percentComplete: row.percentComplete,
      });
    }
  } catch { /* fallback to json */ }
  return map;
}

export async function persistSagas(
  prisma: PrismaService | null,
  sagas: Map<string, EtoSagaState>,
): Promise<'postgres' | 'json'> {
  saveSagasToJson(sagas);
  if (!prisma) return 'json';
  try {
    for (const saga of sagas.values()) {
      await prisma.etoSaga.upsert({
        where: { correlationId: saga.correlationId },
        create: {
          correlationId: saga.correlationId,
          projectId: saga.projectId,
          tenantId: 'default',
          status: saga.status ?? 'ACTIVE',
          completedSteps: saga.completedSteps,
          lastEventAt: new Date(saga.lastEventAt),
          percentComplete: saga.percentComplete,
        },
        update: {
          projectId: saga.projectId,
          status: saga.status ?? 'ACTIVE',
          completedSteps: saga.completedSteps,
          lastEventAt: new Date(saga.lastEventAt),
          percentComplete: saga.percentComplete,
        },
      });
    }
    return 'postgres';
  } catch {
    return 'json';
  }
}

export async function resolveStore(prisma: PrismaService | null): Promise<'postgres' | 'json'> {
  if (!prisma) return 'json';
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'postgres';
  } catch {
    return 'json';
  }
}

export async function recordCompensation(
  prisma: PrismaService | null,
  correlationId: string,
  step: string,
  action: string,
) {
  if (!prisma) return;
  try {
    await prisma.etoSagaCompensation.create({
      data: { correlationId, step, action, status: 'DONE' },
    });
  } catch { /* non-fatal */ }
}

export async function listCompensations(prisma: PrismaService | null, correlationId?: string, take = 20) {
  if (!prisma) return [];
  try {
    return prisma.etoSagaCompensation.findMany({
      where: correlationId ? { correlationId } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
    });
  } catch {
    return [];
  }
}

// Legacy exports
export const loadSagas = loadSagasFromJson;
export const saveSagas = saveSagasToJson;
