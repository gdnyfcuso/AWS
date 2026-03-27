const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 检查City记录
  const cities = await prisma.city.findMany();
  console.log('Cities in database:');
  for (const city of cities) {
    console.log(`  ID: ${city.id}, city_id: ${city.city_id}, name: ${city.name}`);
  }
  
  // 检查shanghai记录
  const shanghai = await prisma.city.findUnique({
    where: { city_id: 'shanghai' }
  });
  console.log('\nShanghai:', shanghai ? `ID=${shanghai.id}, name=${shanghai.name}` : 'NOT FOUND');
  
  await prisma.$disconnect();
}

main();
