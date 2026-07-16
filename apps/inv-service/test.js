const { PrismaClient } = require('@prisma/client-inv');

async function test() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://erp_user:erp_password@localhost:5436/inv_db?schema=public'
      }
    }
  });

  try {
    const res = await prisma.$queryRaw`SELECT * FROM public."Item"`;
    console.log("queryRaw result:", res);

    const items = await prisma.item.findMany();
    console.log("findMany result:", items);
  } catch (err) {
    console.error(err);
  }
}
test();
