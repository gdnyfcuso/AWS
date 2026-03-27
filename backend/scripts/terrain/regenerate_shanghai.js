const { cityTerrainSystem } = require('./dist/core/CityTerrainSystem.js');

async function main() {
  console.log('Regenerating Shanghai terrain...');
  const terrainData = await cityTerrainSystem.regenerateTerrain('shanghai');
  
  console.log('Regeneration complete!');
  console.log('Mountains:', terrainData.mountains.length);
  console.log('Hills:', terrainData.hills.length);
  console.log('Rivers:', terrainData.rivers.length);
  console.log('Waters:', terrainData.waters.length);
  
  if (terrainData.rivers.length > 0) {
    console.log('\\nRivers details:');
    terrainData.rivers.forEach(r => {
      console.log(`  - ${r.name}: ${r.metadata?.path?.length || 0} waypoints, width=${r.metadata?.width}m`);
    });
  }
}

main().catch(console.error);
