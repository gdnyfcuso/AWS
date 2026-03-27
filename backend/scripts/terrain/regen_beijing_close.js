const { cityTerrainSystem } = require('./dist/core/CityTerrainSystem.js');

async function main() {
  console.log('清除北京地形缓存并重新生成...');
  await cityTerrainSystem.clearTerrainCache('beijing');
  const terrainData = await cityTerrainSystem.loadCityTerrain({
    id: 'beijing',
    name: '北京',
    nameEn: 'Beijing',
    country: '中国',
    province: '北京市',
    center: { lat: 39.9042, lng: 116.4074 },
    bounds: {
      minLat: 39.4,
      maxLat: 41.05,
      minLng: 115.4,
      maxLng: 117.5
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
  });

  console.log('Complete!');
  console.log('Mountains:', terrainData.mountains.length);
  console.log('Rivers:', terrainData.rivers.length);
  
  if (terrainData.mountains.length > 0) {
    console.log('\\nMountains details:');
    terrainData.mountains.slice(0, 3).forEach(m => {
      const pos = m.position;
      console.log(`  - ${m.name}: x=${pos.x?.toFixed(0)}m, z=${pos.z?.toFixed(0)}m, height=${m.height}m`);
    });
  }
  
  if (terrainData.rivers.length > 0) {
    console.log('\\nRivers details:');
    terrainData.rivers.forEach(r => {
      const metadata = r.metadata || {};
      const path = metadata.path || [];
      console.log(`  - ${r.name}: ${path.length} points, width=${metadata.width || 0}m`);
      if (path.length > 0) {
        console.log(`      起点: (${path[0].x?.toFixed(0)}, ${path[0].z?.toFixed(0)})`);
        console.log(`      终点: (${path[path.length-1].x?.toFixed(0)}, ${path[path.length-1].z?.toFixed(0)})`);
      }
    });
  }
}

main().catch(console.error);
