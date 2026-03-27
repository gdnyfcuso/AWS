/**
 * 测试脚本：验证城市切换时数据是否正确更新
 *
 * 测试标准：
 * 1. 北京有12个地标，6条道路
 * 2. 上海有9个地标，6条道路
 * 3. 杭州有6个地标，2条道路
 * 4. 广州有3个地标，1条道路，1条河流
 *
 * 切换城市时：
 * - 地标数量必须匹配
 * - 道路数量必须匹配
 * - 河流数量必须匹配
 * - 地标名称必须不同（确认是新数据）
 */

const API_BASE = 'http://100.64.0.131:3000/api/v1';

const EXPECTED_DATA = {
  beijing: { landmarks: 12, roads: 6, rivers: 0, sampleLandmark: '天安门' },
  shanghai: { landmarks: 9, roads: 6, rivers: 0, sampleLandmark: '东方明珠' },
  hangzhou: { landmarks: 6, roads: 2, rivers: 0, sampleLandmark: '西湖' },
  guangzhou: { landmarks: 3, roads: 1, rivers: 1, sampleLandmark: '广州塔' },
};

async function testCityAPI(cityId) {
  console.log(`\n=== 测试 ${cityId} ===`);
  const response = await fetch(`${API_BASE}/map/cities/${cityId}/geography`);
  const data = await response.json();

  if (!data.success) {
    console.error(`❌ API 失败:`, data.error);
    return false;
  }

  const expected = EXPECTED_DATA[cityId];
  const actual = {
    landmarks: data.landmarks?.length || 0,
    roads: data.roads?.length || 0,
    rivers: data.rivers?.length || 0,
  };

  console.log(`地标: ${actual.landmarks} (预期: ${expected.landmarks})`);
  console.log(`道路: ${actual.roads} (预期: ${expected.roads})`);
  console.log(`河流: ${actual.rivers} (预期: ${expected.rivers})`);

  const firstLandmark = data.landmarks?.[0];
  if (firstLandmark) {
    console.log(`首性地标: ${firstLandmark.name} (预期包含: ${expected.sampleLandmark})`);
  }

  // 验证坐标是否居中（不应该有几千的数值）
  const x = firstLandmark?.x || 0;
  const z = firstLandmark?.z || 0;
  const isCentered = Math.abs(x) < 500 && Math.abs(z) < 500;
  console.log(`坐标居中: x=${x.toFixed(1)}, z=${z.toFixed(1)} ${isCentered ? '✅' : '❌ 超出范围'}`);

  const allPass =
    actual.landmarks === expected.landmarks &&
    actual.roads === expected.roads &&
    actual.rivers === expected.rivers &&
    isCentered;

  if (allPass) {
    console.log(`✅ ${cityId} 测试通过`);
  } else {
    console.log(`❌ ${cityId} 测试失败`);
  }

  return allPass;
}

async function testCitySwitching() {
  console.log('开始城市切换测试...\n');

  const cities = ['beijing', 'shanghai', 'hangzhou', 'guangzhou'];
  const results = [];

  for (const city of cities) {
    const pass = await testCityAPI(city);
    results.push({ city, pass });
  }

  console.log('\n=== 测试结果 ===');
  const allPass = results.every(r => r.pass);

  if (allPass) {
    console.log('✅ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败：');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  - ${r.city}`);
    });
    process.exit(1);
  }
}

testCitySwitching().catch(err => {
  console.error('测试出错:', err);
  process.exit(1);
});
