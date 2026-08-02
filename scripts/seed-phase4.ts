import { PrismaClient as PmPrisma } from '../node_modules/.prisma/client-pm';
// Native fetch

const PROC_URL = 'http://localhost:4004';
const MES_URL = 'http://localhost:4006';

const pmPrisma = new PmPrisma();

async function simulateFactory() {
  console.log('\n🚀 Faza 4: Uderzenie E2E w fabrykę (PROC & MES) - RETRY');
  
  const pmProjects = await pmPrisma.project.findMany({
    include: { wbsElements: true }
  });

  console.log(`Zaleziono ${pmProjects.length} automatycznie wygenerowanych projektów PM.`);

  const procProjects = pmProjects.slice(0, 10);
  console.log(`\n📦 Symulacja PROC MRP dla ${procProjects.length} projektów...`);
  for (const p of procProjects) {
    await fetch(`${PROC_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'HW-ROBOT-ARM',
        amount: 2,
        projectId: p.id
      })
    });
  }

  const mesProjects = pmProjects.slice(10, 15);
  console.log(`\n🚨 Symulacja ANDON MES (Zamrożenie) dla ${mesProjects.length} projektów...`);
  for (const p of mesProjects) {
    const rootWbs = p.wbsElements.find(w => w.type === 'ROOT');
    if (rootWbs) {
      await fetch(`${MES_URL}/mes/andon/ncr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: rootWbs.id,
          defectCode: 'DEF-001',
          description: 'Krytyczne zwarcie w szafie sterowniczej. Zamrażam operację (ON_HOLD).',
          operatorId: 'SYSTEM_SIMULATION'
        })
      });
    }
  }
}

simulateFactory().finally(() => pmPrisma.$disconnect());
