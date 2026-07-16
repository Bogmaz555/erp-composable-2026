import { PrismaService } from './prisma.service';
import {
  DEFAULT_LABOR_RATE_PLN_PER_HOUR,
  DEFAULT_OVERHEAD_RATE_PCT,
} from './eto-project-costing';

export async function resolveLaborRatePln(
  prisma: PrismaService,
  projectId?: string,
  tenantId = 'default',
): Promise<number> {
  try {
    const projectRate = projectId
      ? await prisma.costRate.findFirst({
          where: { tenantId, projectId, costType: 'LABOR' },
          orderBy: { effectiveFrom: 'desc' },
        })
      : null;
    if (projectRate) return projectRate.rateValue;

    const globalRate = await prisma.costRate.findFirst({
      where: { tenantId, projectId: null, costType: 'LABOR' },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (globalRate) return globalRate.rateValue;
  } catch {
    /* schema not migrated — fallback */
  }
  return DEFAULT_LABOR_RATE_PLN_PER_HOUR;
}

export async function resolveOverheadPct(
  prisma: PrismaService,
  projectId?: string,
  tenantId = 'default',
): Promise<number> {
  try {
    const row = await prisma.costRate.findFirst({
      where: {
        tenantId,
        costType: 'OVERHEAD',
        OR: [{ projectId: projectId ?? undefined }, { projectId: null }],
      },
      orderBy: { projectId: 'desc' },
    });
    if (row?.unit === 'PCT') return row.rateValue;
  } catch {
    /* fallback */
  }
  return DEFAULT_OVERHEAD_RATE_PCT;
}
