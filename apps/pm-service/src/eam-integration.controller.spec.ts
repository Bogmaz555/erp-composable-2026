import { EamIntegrationController } from './eam-integration.controller';
import { PrismaService } from './prisma.service';

describe('EamIntegrationController', () => {
  it('sets fever RED on breakdown when projectId present', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { project: { updateMany } } as unknown as PrismaService;
    const controller = new EamIntegrationController(prisma);

    await controller.handleBreakdown({
      equipmentId: 'eq-1',
      reason: 'motor fault',
      severity: 'HIGH',
      detectedAt: new Date().toISOString(),
      projectId: 'proj-1',
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: expect.objectContaining({ feverZone: 'RED' }),
    });
  });
});
