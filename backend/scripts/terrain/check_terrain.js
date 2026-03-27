const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const city = await prisma.city.findUnique({
    where: { city_id: 'shanghai' },
    include: { terrain_features: true }
  });
  
  if (city) {
    console.log('City found:', city.name);
    console.log('Terrain cached:', city.terrain_cached);
    console.log('Terrain features count:', city.terrain_features.length);
    city.terrain_features.forEach(f => {
      console.log(`  - ${f.type}: ${f.name}`);
    });
  } else {
    console.log('City not found - need to create');
  }
  
  await prisma.$disconnect();
}

main();
