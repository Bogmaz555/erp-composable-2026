import { PrismaClient } from '../node_modules/.prisma/client-inv';

const prisma = new PrismaClient();

async function main() {
  const items = [
    { sku: 'HW-ROBOT-ARM', name: 'Ramię Robota Kawasaki', type: 'COMPONENT', unit: 'szt' },
    { sku: 'HW-CONVEYOR-BELT', name: 'Pas Transmisyjny 5m', type: 'COMPONENT', unit: 'm' },
    { sku: 'SW-PLC-LICENSE', name: 'Licencja PLC Siemens', type: 'SOFTWARE', unit: 'szt' },
    { sku: 'RAW-STEEL-10MM', name: 'Blacha Stalowa 10mm', type: 'RAW_MATERIAL', unit: 'kg' }
  ];

  for (const it of items) {
    const existing = await prisma.item.findUnique({ where: { sku: it.sku } });
    if (!existing) {
      const item = await prisma.item.create({
        data: {
          sku: it.sku,
          name: it.name,
          type: it.type,
          stockQuantity: 100, // Denormalized cache
          stockLevels: {
            create: {
              quantity: 100,
              location: 'MAIN'
            }
          }
        }
      });
      console.log(`Zarejestrowano ${it.sku}`);
    }
  }

  console.log('Seed INV zakończony.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
