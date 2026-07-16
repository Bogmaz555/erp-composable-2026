import { PrismaClient as CrmClient } from '@prisma/client-crm';
import { PrismaClient as PmClient } from '@prisma/client-pm';
import { PrismaClient as InvClient } from '@prisma/client-inventory';

// Temporary fix for InvClient if it was generated natively inside inventory module
// If @prisma/client-inventory doesn't resolve, user can adjust path.
// According to schema, PM is client-pm, CRM is client-crm.
// Inventory schema had output = "../../node_modules/@prisma/client/inventory"
// but we will import it appropriately. If the alias fails we can rely on relative paths.
// But mostly users alias it or npm resolves it. Let's try standard imports.

const crm = new CrmClient();
const pm = new PmClient();
const inv = new InvClient();

async function main() {
  console.log('✅ Wstrzykiwanie danych ETO (Seed) start...');

  // --- CRM ---
  console.log('⏳ Seeding CRM...');
  const customer1 = await crm.customer.create({
    data: {
      name: 'Tech-Auto Robotics Sp. z o.o.',
      nip: 'PL1234567890',
      email: 'contact@tech-auto.pl',
    },
  });

  const customer2 = await crm.customer.create({
    data: {
      name: 'Eco-Fabryka S.A.',
      nip: 'PL0987654321',
      email: 'zakupy@eco-fabryka.pl',
    },
  });

  const opp1 = await crm.opportunity.create({
    data: {
      title: 'Zrobotyzowana Linia Spawalnicza',
      value: 1200000,
      tkw: 850000,
      status: 'ACCEPTED', // Won
      customerId: customer1.id,
    },
  });

  const opp2 = await crm.opportunity.create({
    data: {
      title: 'Cela Montażu Baterii EV',
      value: 950000,
      tkw: 700000,
      status: 'ACCEPTED', // Won
      customerId: customer2.id,
    },
  });

  await crm.opportunity.create({
    data: {
      title: 'Stanowisko Testowe End-of-Line',
      value: 300000,
      status: 'QUOTED', // Negotiation
      customerId: customer1.id,
    },
  });

  await crm.opportunity.create({
    data: {
      title: 'Wymiana Sterowników PLC',
      value: 150000,
      status: 'NEW', // RFQ
      customerId: customer2.id,
    },
  });

  await crm.opportunity.create({
    data: {
      title: 'System Transportu Palet',
      value: 500000,
      status: 'NEW', // Feasibility
      customerId: customer1.id,
    },
  });

  // Create Projects in CRM for completed Ops
  const crmProj1 = await crm.project.create({
    data: {
      name: opp1.title,
      budget: opp1.value,
      tkw: opp1.tkw,
      status: 'ACTIVE',
      customerId: customer1.id,
    },
  });

  const crmProj2 = await crm.project.create({
    data: {
      name: opp2.title,
      budget: opp2.value,
      tkw: opp2.tkw,
      status: 'ACTIVE',
      customerId: customer2.id,
    },
  });

  // Link opportunity to project
  await crm.opportunity.update({
    where: { id: opp1.id },
    data: { projectId: crmProj1.id },
  });
  await crm.opportunity.update({
    where: { id: opp2.id },
    data: { projectId: crmProj2.id },
  });

  // --- PM ---
  console.log('⏳ Seeding PM...');
  const pmProj1 = await pm.project.create({
    data: {
      id: crmProj1.id, // share ID
      code: 'PRJ-2026-001',
      name: crmProj1.name,
      description: 'Dostawa pod klucz zrobotyzowanej linii spawalniczej',
      isActive: true,
    },
  });

  const pmProj2 = await pm.project.create({
    data: {
      id: crmProj2.id,
      code: 'PRJ-2026-002',
      name: crmProj2.name,
      description: 'Zaprojektowanie i wykonanie celi montażu baterii EV',
      isActive: true,
    },
  });

  // WBS for Proj1
  const phaseDesign1 = await pm.projectWBS.create({
    data: {
      projectId: pmProj1.id,
      name: 'Projektowanie Mechaniczne',
      type: 'PHASE',
    },
  });
  const phasePurchasing1 = await pm.projectWBS.create({
    data: {
      projectId: pmProj1.id,
      name: 'Zakupy',
      type: 'PHASE',
    },
  });
  const phaseAssembly1 = await pm.projectWBS.create({
    data: {
      projectId: pmProj1.id,
      name: 'Montaż',
      type: 'PHASE',
    },
  });
  const phaseFat1 = await pm.projectWBS.create({
    data: {
      projectId: pmProj1.id,
      name: 'FAT',
      type: 'PHASE',
    },
  });

  await pm.projectBudget.create({
    data: { wbsId: phaseDesign1.id, type: 'PRELIMINARY', amount: 50000 },
  });
  await pm.projectBudget.create({
    data: { wbsId: phasePurchasing1.id, type: 'PRELIMINARY', amount: 600000 },
  });
  await pm.projectBudget.create({
    data: { wbsId: phaseAssembly1.id, type: 'PRELIMINARY', amount: 150000 },
  });
  await pm.projectBudget.create({
    data: { wbsId: phaseFat1.id, type: 'PRELIMINARY', amount: 50000 },
  });

  // --- INVENTORY ---
  console.log('⏳ Seeding INVENTORY...');
  const products = [
    { sku: 'YAS-5KW', name: 'Serwomotor Yaskawa 5kW', qty: 10 },
    { sku: 'SIE-1500', name: 'Sterownik Siemens S7-1500', qty: 5 },
    { sku: 'SIC-OPT', name: 'Czujnik optyczny Sick', qty: 45 },
    { sku: 'BOS-ALU', name: 'Profile aluminiowe Bosch 45x45', qty: 200 },
    { sku: 'FES-PNEU', name: 'Siłownik pneumatyczny Festo DSNU', qty: 12 },
    { sku: 'OMR-REL', name: 'Przekaźnik bezpieczeństwa Omron', qty: 30 },
    { sku: 'SCH-CBR', name: 'Wyłącznik nadprądowy Schneider', qty: 50 },
    { sku: 'IGU-ECHA', name: 'Prowadnik kablowy Igus', qty: 100 },
    { sku: 'KUK-ROB', name: 'Manipulator KUKA KR C4', qty: 2 },
    { sku: 'PIL-SAF', name: 'Kurtyna bezpieczeństwa Pilz', qty: 8 },
    { sku: 'RIT-ENC', name: 'Szafa sterownicza Rittal', qty: 4 },
    { sku: 'WAG-TER', name: 'Złączki szynowe WAGO', qty: 1000 },
    { sku: 'KEY-VIS', name: 'System wizyjny Keyence', qty: 3 },
    { sku: 'SMC-VAL', name: 'Wyspa zaworowa SMC', qty: 6 },
    { sku: 'SKF-BRG', name: 'Łożysko liniowe SKF', qty: 40 },
    { sku: 'BEC-IPC', name: 'Komputer przemysłowy Beckhoff', qty: 2 },
    { sku: 'MUR-CBL', name: 'Przewód czujnikowy Murrelektronik M8', qty: 150 },
    { sku: 'IFM-PRX', name: 'Czujnik zbliżeniowy IFM', qty: 60 },
    { sku: 'FAN-MOT', name: 'Silnik krokowy Fanuc', qty: 8 },
    { sku: 'PHO-PWR', name: 'Zasilacz Phoenix Contact 24V', qty: 15 },
    { sku: 'BOS-CON', name: 'Łącznik kątowy Bosch Rexroth', qty: 300 }
  ];

  for (const prod of products) {
    const item = await inv.item.create({
      data: {
        sku: prod.sku,
        name: prod.name,
        description: 'Komponent ETO',
        stockQuantity: prod.qty,
      },
    });

    await inv.batch.create({
      data: {
        batchNumber: `BAT-${prod.sku}-001`,
        itemId: item.id,
        quantity: prod.qty,
        manufacturerLot: `LOT-${Math.floor(Math.random() * 10000)}`,
      },
    });
  }

  console.log('✅ Baza danych ETO wyseedowana pomyślnie!');
}

main()
  .catch((e) => {
    console.error('❌ Błąd poczas seedowania: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await crm.$disconnect();
    await pm.$disconnect();
    await inv.$disconnect();
  });
