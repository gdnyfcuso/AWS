const { PrismaClient } = require('@prisma/client');
const { cityTerrainSystem } = require('./dist/core/CityTerrainSystem.js');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing Shanghai terrain cache...');
  
  // 清除缓存标记
  await prisma.city.update({
    where: { city_id: 'shanghai' },
    data: { terrain_cached: false }
  });
  
  console.log('Cache cleared. Regenerating terrain...');
  
  // 重新生成地形
  const terrainData = await cityTerrainSystem.regenerateTerrain('shanghai');
  
  console.log('Regeneration complete!');
  console.log('Mountains:', terrainData.mountains.length);
  console.log('Hills:', terrainData.hills.length);
  console.log('Rivers:', terrainData.rivers.length);
  console.log('Waters:', terrainData.waters.length);
  
  await prisma.$disconnect();
}

main().catch(console.error);
