import { PrismaClient as CrmClient } from '../node_modules/.prisma/client-crm/index.js';
import { PrismaClient as PmClient } from '../node_modules/.prisma/client-pm/index.js';
import { PrismaClient as InvClient } from '../node_modules/.prisma/client-inv/index.js';

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
      updatedAt: new Date(),
    },
  });

  const opp2 = await crm.opportunity.create({
    data: {
      title: 'Cela Montażu Baterii EV',
      value: 950000,
      tkw: 700000,
      status: 'ACCEPTED', // Won
      customerId: customer2.id,
      updatedAt: new Date(),
    },
  });

  await crm.opportunity.create({
    data: {
      title: 'Stanowisko Testowe End-of-Line',
      value: 300000,
      status: 'NEGOTIATION', // Negotiation
      customerId: customer1.id,
      updatedAt: new Date(),
    },
  });

  await crm.opportunity.create({
    data: {
      title: 'Wymiana Sterowników PLC',
      value: 150000,
      status: 'NEW', // RFQ
      customerId: customer2.id,
      updatedAt: new Date(),
    },
  });

  await crm.opportunity.create({
    data: {
      title: 'System Transportu Palet',
      value: 500000,
      status: 'NEW', // Feasibility
      customerId: customer1.id,
      updatedAt: new Date(),
    },
  });

  // --- PM ---
  console.log('⏳ Seeding PM...');
  const pmProj1 = await pm.project.create({
    data: {
      name: opp1.title,
      status: 'ACTIVE',
      budget: 850000,
    },
  });

  const pmProj2 = await pm.project.create({
    data: {
      name: opp2.title,
      status: 'ACTIVE',
      budget: 700000,
    },
  });

  // Link opportunity to project
  await crm.opportunity.update({
    where: { id: opp1.id },
    data: { linkedProjectId: pmProj1.id, updatedAt: new Date() },
  });
  await crm.opportunity.update({
    where: { id: opp2.id },
    data: { linkedProjectId: pmProj2.id, updatedAt: new Date() },
  });

  // WBS for Proj1
  const phaseDesign1 = await pm.wbsElement.create({
    data: {
      projectId: pmProj1.id,
      name: 'Projektowanie Mechaniczne',
      type: 'PHASE',
    },
  });
  const phasePurchasing1 = await pm.wbsElement.create({
    data: {
      projectId: pmProj1.id,
      name: 'Zakupy',
      type: 'PHASE',
    },
  });
  const phaseAssembly1 = await pm.wbsElement.create({
    data: {
      projectId: pmProj1.id,
      name: 'Montaż',
      type: 'PHASE',
    },
  });
  const phaseFat1 = await pm.wbsElement.create({
    data: {
      projectId: pmProj1.id,
      name: 'FAT',
      type: 'PHASE',
    },
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
    const item = await inv.item.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        description: 'Komponent ETO',
        stockQuantity: prod.qty,
      },
      create: {
        sku: prod.sku,
        name: prod.name,
        description: 'Komponent ETO',
        stockQuantity: prod.qty,
      },
    });

    const lotNum = `LOT-${prod.sku}-001`;
    await inv.lot.upsert({
      where: { serialNumber: lotNum },
      update: { quantity: prod.qty },
      create: {
        lotNumber: lotNum,
        serialNumber: lotNum,
        itemId: item.id,
        quantity: prod.qty,
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
