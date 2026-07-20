import { PrismaClient as CrmPrisma } from '../node_modules/.prisma/client-crm';
import { PrismaClient as PmPrisma } from '../node_modules/.prisma/client-pm';
// Native fetch used

const CRM_URL = 'http://localhost:4001';
const PROC_URL = 'http://localhost:4004';
const MES_URL = 'http://localhost:4006';

const crmPrisma = new CrmPrisma();
const pmPrisma = new PmPrisma();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const COMPANIES = [
  { companyName: 'Ruukki Polska Sp. z o.o.', nip: '5260205871' },
  { companyName: 'Astorino Robotics Sp. z o.o.', nip: '6762312015' },
  { companyName: 'KGHM Polska Miedź S.A.', nip: '6920000013' },
  { companyName: 'Orlen S.A.', nip: '7740001454' },
  { companyName: 'Volkswagen Poznań', nip: '7820032965' },
];

const OPPORTUNITY_TYPES = [
  { title: 'Zrobotyzowana linia pakująca (12m)', est: 1200000 },
  { title: 'Zrobotyzowana linia paletyzująca', est: 850000 },
  { title: 'Zautomatyzowana linia cięcia i gięcia', est: 2500000 },
  { title: 'Seryjne wdrożenie robotów Astorino (10 szt)', est: 500000 },
  { title: 'Cela spawalnicza KUKA', est: 650000 },
];

const BOMS = [
  { sku: 'HW-ROBOT-ARM', quantity: 2 },
  { sku: 'HW-CONVEYOR-BELT', quantity: 15 },
  { sku: 'SW-PLC-LICENSE', quantity: 1 },
  { sku: 'SVC-INSTALLATION', quantity: 100 }, // 100 hours
];

async function createLeads() {
  console.log('🚀 Faza 1: Uruchamianie zmasowanego uderzenia w API CRM (Generowanie 50 leadów)...');
  const leads = [];

  for (let i = 0; i < 50; i++) {
    const comp = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
    const opp = OPPORTUNITY_TYPES[Math.floor(Math.random() * OPPORTUNITY_TYPES.length)];
    
    const payload = {
      companyName: `${comp.companyName} #${i+1}`,
      nip: comp.nip,
      email: `contact${i}@${comp.companyName.split(' ')[0].toLowerCase()}.pl`,
      title: opp.title,
      estimatedValue: opp.est + Math.floor(Math.random() * 50000),
      currency: 'PLN'
    };

    try {
      const res = await fetch(`${CRM_URL}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      leads.push(data.id);
      
      if (i % 10 === 0) console.log(`   Utworzono ${i} leadów...`);
    } catch (e) {
      console.error(`Błąd przy tworzeniu leada: ${e}`);
    }
  }
  
  console.log(`✅ Faza 1 zakończona. Wygenerowano ${leads.length} leadów ETO.`);
  return leads;
}

async function addBOMs(leadIds: string[]) {
  console.log('\n🚀 Faza 2: Konfigurator CPQ. Zrzucanie BOM-ów dla każdego projektu...');
  
  // Wrzucamy BOM-y dla wszystkich leadów
  for (const id of leadIds) {
    try {
      await fetch(`${CRM_URL}/bom`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: id,
          items: BOMS.map(b => ({ catalogItemId: b.sku, quantity: b.quantity }))
        })
      });
    } catch (e) {
      console.error(`Błąd przy dodawaniu BOM dla leada ${id}: ${e}`);
    }
  }
  console.log('✅ Faza 2 zakończona. BOM i budżety Baseline Cost / Target Revenue ustawione w CRM.');
}

async function winOpportunities(leadIds: string[]) {
  console.log('\n🚀 Faza 3: Manewr Kanbanowy. Przenoszenie 30 szans do statusu ACCEPTED (Wyzwalanie NATS)...');
  
  const toWin = leadIds.slice(0, 30);
  
  // Asynchronous Promise.all to simulate burst traffic
  await Promise.all(toWin.map(id => 
    fetch(`${CRM_URL}/pipeline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'ACCEPTED' })
    })
  ));
  
  console.log('✅ Zdarzenia crm.opportunity.won.v1 zostały wysłane. Czekamy 10 sekund na przetworzenie przez pm-service...');
  await sleep(10000);
}

async function simulateFactory(leadIds: string[]) {
  console.log('\n🚀 Faza 4: Uderzenie E2E w fabrykę (PROC & MES)');
  
  const pmProjects = await pmPrisma.project.findMany({
    where: { id: { in: leadIds } },
    include: { wbsElements: true }
  });

  console.log(`Zaleziono ${pmProjects.length} automatycznie wygenerowanych projektów PM.`);

  const procProjects = pmProjects.slice(0, 10);
  console.log(`\n📦 Symulacja PROC MRP dla ${procProjects.length} projektów...`);
  for (const p of procProjects) {
    // Generujemy zamówienia na HW-ROBOT-ARM
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

async function main() {
  try {
    const leadIds = await createLeads();
    await addBOMs(leadIds);
    await winOpportunities(leadIds);
    await simulateFactory(leadIds);
    
    console.log('\n🦅 MANEWR ZAKOŃCZONY BEZWZGLĘDNYM SUKCESEM. SYSTEM PRZETRWAŁ OSTRZAŁ!');
  } catch (e) {
    console.error('Błąd symulacji:', e);
  } finally {
    await crmPrisma.$disconnect();
    await pmPrisma.$disconnect();
  }
}

main();
