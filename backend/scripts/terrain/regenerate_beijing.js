const { cityTerrainSystem } = require('./dist/core/CityTerrainSystem.js');

async function main() {
  console.log('Regenerating Beijing terrain...');
  const terrainData = await cityTerrainSystem.regenerateTerrain('beijing');
  
  console.log('Complete!');
  console.log('Rivers:', terrainData.rivers.length);
  terrainData.rivers.forEach(r => {
    console.log(`  - ${r.name}: ${r.metadata?.path?.length || 0} waypoints`);
  });
}

main().catch(console.error);
