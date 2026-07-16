import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class ApplyNcrDelayCommand {
  constructor(
    public readonly projectId: string,
    public readonly workOrderId: string,
    public readonly defectCode: string,
  ) {}
}

@CommandHandler(ApplyNcrDelayCommand)
export class ApplyNcrDelayHandler implements ICommandHandler<ApplyNcrDelayCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ApplyNcrDelayCommand) {
    const project = await this.prisma.project.findUnique({
      where: { id: command.projectId },
      include: { wbsElements: { orderBy: { startDate: 'asc' } } },
    });

    if (!project) {
      console.warn(`[ApplyNcrDelay] Project ${command.projectId} not found.`);
      return { ok: false };
    }

    // 1. Zlokalizuj element WBS, na którym prawdopodobnie był NCR. 
    // Uproszczenie heurystyczne: bierzemy pierwszy PENDING lub w ostateczności pierwszy w ogóle.
    let targetWbs = project.wbsElements.find(el => el.status === 'PENDING') || project.wbsElements[0];

    // 2. Wydłużenie endDate
    if (targetWbs && targetWbs.endDate) {
      const newEndDate = new Date(targetWbs.endDate);
      newEndDate.setDate(newEndDate.getDate() + 2); // dodajemy 2 dni
      await this.prisma.wbsElement.update({
        where: { id: targetWbs.id },
        data: { endDate: newEndDate },
      });
    }

    // 3. Konsumpcja bufora projektu
    const penaltyDays = 2;
    const newUsedBuffer = (project.usedBufferDays || 0) + penaltyDays;
    const totalBuffer = project.totalBufferDays || 1; // Zabezpieczenie przed / 0

    // 4. Przeliczenie Fever Zone
    const ratio = newUsedBuffer / totalBuffer;
    let feverZone = 'GREEN';
    if (ratio >= 0.33 && ratio < 0.66) feverZone = 'YELLOW';
    else if (ratio >= 0.66) feverZone = 'RED';

    // 5. Aktualizacja projektu
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        usedBufferDays: newUsedBuffer,
        feverZone,
      },
    });

    return { ok: true, projectId: project.id, newUsedBuffer, feverZone };
  }
}
