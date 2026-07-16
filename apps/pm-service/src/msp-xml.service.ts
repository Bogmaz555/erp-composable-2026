import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

export interface MspTask {
  name: string;
  start: Date;
  finish: Date;
  uid?: string;
}

export interface MspPredecessorLink {
  predecessorUid: string;
  successorUid: string;
  type: string;
  lagDays: number;
}

const MSP_TYPE_MAP: Record<string, string> = {
  '0': 'FF',
  '1': 'FS',
  '2': 'SF',
  '3': 'SS',
  FF: 'FF',
  FS: 'FS',
  SF: 'SF',
  SS: 'SS',
};

@Injectable()
export class MspXmlService {
  constructor(private readonly prisma: PrismaService) {}

  /** Parsuje uproszczony MS Project XML (MSPdi). */
  parseTasks(xml: string): MspTask[] {
    const tasks: MspTask[] = [];
    const blocks = xml.split(/<Task>/i).slice(1);
    for (const block of blocks) {
      const chunk = block.split(/<\/Task>/i)[0] ?? '';
      const name = this.tag(chunk, 'Name');
      const startRaw = this.tag(chunk, 'Start');
      const finishRaw = this.tag(chunk, 'Finish');
      const uid = this.tag(chunk, 'UID');
      if (!name || !startRaw) continue;
      const start = new Date(startRaw);
      const finish = finishRaw ? new Date(finishRaw) : new Date(start.getTime() + 86400000);
      if (isNaN(start.getTime())) continue;
      tasks.push({ name: name.trim(), start, finish, uid: uid ?? undefined });
    }
    return tasks;
  }

  /** Parsuje PredecessorLink z MS Project XML. */
  parsePredecessorLinks(xml: string): MspPredecessorLink[] {
    const links: MspPredecessorLink[] = [];
    const blocks = xml.split(/<PredecessorLink>/i).slice(1);
    for (const block of blocks) {
      const chunk = block.split(/<\/PredecessorLink>/i)[0] ?? '';
      const predecessorUid = this.tag(chunk, 'PredecessorUID');
      const successorUid = this.tag(chunk, 'SuccessorUID');
      if (!predecessorUid || !successorUid) continue;
      const typeRaw = this.tag(chunk, 'Type') ?? '1';
      const lagRaw = this.tag(chunk, 'LinkLag') ?? this.tag(chunk, 'Lag') ?? '0';
      const lagDays = Math.round(parseInt(lagRaw, 10) / 4800) || 0; // MSP: 4800 min = 1 day
      links.push({
        predecessorUid,
        successorUid,
        type: MSP_TYPE_MAP[typeRaw] ?? 'FS',
        lagDays,
      });
    }
    return links;
  }

  private tag(block: string, tag: string): string | null {
    const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
    return m?.[1]?.trim() ?? null;
  }

  /** Importuje zadania MSP → WBS + zależności predecessor/successor. */
  async importToProject(projectId: string, xml: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { wbsElements: true },
    });
    if (!project) return { error: 'Project not found' };

    const tasks = this.parseTasks(xml);
    const links = this.parsePredecessorLinks(xml);
    const byName = new Map(project.wbsElements.map((w) => [w.name.toLowerCase(), w]));
    const uidToWbsId = new Map<string, string>();
    let updated = 0;
    let created = 0;

    for (const t of tasks) {
      const existing = byName.get(t.name.toLowerCase());
      if (existing) {
        await this.prisma.wbsElement.update({
          where: { id: existing.id },
          data: { startDate: t.start, endDate: t.finish },
        });
        if (t.uid) uidToWbsId.set(t.uid, existing.id);
        updated++;
      } else {
        const wbs = await this.prisma.wbsElement.create({
          data: {
            id: randomUUID(),
            projectId,
            tenantId: project.tenantId,
            name: t.name,
            type: 'TASK',
            startDate: t.start,
            endDate: t.finish,
            status: 'PENDING',
          },
        });
        byName.set(t.name.toLowerCase(), wbs);
        if (t.uid) uidToWbsId.set(t.uid, wbs.id);
        created++;
      }
    }

    let dependenciesCreated = 0;
    let dependenciesSkipped = 0;

    for (const link of links) {
      const predecessorId = uidToWbsId.get(link.predecessorUid);
      const successorId = uidToWbsId.get(link.successorUid);
      if (!predecessorId || !successorId) {
        dependenciesSkipped++;
        continue;
      }
      const dup = await this.prisma.taskDependency.findFirst({
        where: { projectId, predecessorId, successorId },
      });
      if (dup) {
        dependenciesSkipped++;
        continue;
      }
      await this.prisma.taskDependency.create({
        data: {
          projectId,
          tenantId: project.tenantId,
          predecessorId,
          successorId,
          type: link.type,
          lagDays: link.lagDays,
        },
      });
      dependenciesCreated++;
    }

    return {
      projectId,
      parsed: tasks.length,
      updated,
      created,
      linksParsed: links.length,
      dependenciesCreated,
      dependenciesSkipped,
      tasks: tasks.map((t) => t.name),
    };
  }

  private mspTypeCode(type: string): number {
    const map: Record<string, number> = { FF: 0, FS: 1, SF: 2, SS: 3 };
    return map[type] ?? 1;
  }

  private fmt(d: Date | null | undefined): string {
    if (!d) return '2026-01-01T08:00:00';
    return d.toISOString().replace(/\.\d{3}Z$/, '');
  }

  /** Eksport harmonogramu WBS → MS Project XML z PredecessorLink. */
  async exportToXml(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { wbsElements: { orderBy: { createdAt: 'asc' } } },
    });
    if (!project) return '<?xml version="1.0"?><Project><Error>not found</Error></Project>';

    const deps = await this.prisma.taskDependency.findMany({ where: { projectId } });
    const wbsToUid = new Map<string, number>();
    project.wbsElements.forEach((w, i) => wbsToUid.set(w.id, i + 1));

    const taskBlocks = project.wbsElements.map((w) => {
      const uid = wbsToUid.get(w.id) ?? 0;
      return `    <Task>
      <UID>${uid}</UID>
      <Name>${this.escapeXml(w.name)}</Name>
      <Start>${this.fmt(w.startDate)}</Start>
      <Finish>${this.fmt(w.endDate)}</Finish>
    </Task>`;
    }).join('\n');

    const linkBlocks = deps.map((d) => {
      const pred = wbsToUid.get(d.predecessorId);
      const succ = wbsToUid.get(d.successorId);
      if (!pred || !succ) return '';
      return `  <PredecessorLink>
    <PredecessorUID>${pred}</PredecessorUID>
    <SuccessorUID>${succ}</SuccessorUID>
    <Type>${this.mspTypeCode(d.type)}</Type>
    <LinkLag>${d.lagDays * 4800}</LinkLag>
  </PredecessorLink>`;
    }).filter(Boolean).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${this.escapeXml(project.name)}</Name>
  <Tasks>
${taskBlocks}
  </Tasks>
${linkBlocks}
</Project>`;
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
