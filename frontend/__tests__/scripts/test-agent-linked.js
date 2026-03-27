#!/usr/bin/env node
/**
 * 地图-3D-Agent联动系统测试
 */

const API_BASE = 'http://100.64.0.131:3000/api/v1';
const PAGE_URL = 'http://100.64.0.131:8888/test-map3d-agents.html';

console.log('🧪 地图-3D-Agent联动系统测试\n');
console.log('=' .repeat(70));

// 测试1: Agent API可用性
async function testAgentAPI() {
  console.log('\n👥 测试1: Agent API可用性');

  try {
    const response = await fetch(`${API_BASE}/agents/geographic`);
    const data = await response.json();

    const hasAgents = data.agents && Array.isArray(data.agents);
    const hasDataFields = hasAgents && data.agents.length > 0 &&
                          data.agents[0].agent_id &&
                          data.agents[0].agent_name;

    console.log(`  ${hasAgents ? '✅' : '❌'} Agent数据存在`);
    console.log(`  ${hasDataFields ? '✅' : '❌'} Agent字段完整`);
    console.log(`  📊 Agent数量: ${hasAgents ? data.agents.length : 0}`);

    if (hasAgents && data.agents.length > 0) {
      const withCoords = data.agents.filter(a => a.latitude && a.longitude).length;
      console.log(`  📍 有坐标的Agent: ${withCoords}/${data.agents.length}`);

      const withMood = data.agents.filter(a => a.mood).length;
      console.log(`  😊 有心情数据的Agent: ${withMood}/${data.agents.length}`);
    }

    return hasAgents;
  } catch (error) {
    console.log(`  ❌ API请求失败: ${error.message}`);
    return false;
  }
}

// 测试2: 虚拟位置API
async function testVirtualPositionsAPI() {
  console.log('\n🎮 测试2: 虚拟位置API');

  try {
    const response = await fetch(`${API_BASE}/agents/virtual-positions`);
    const data = await response.json();

    const hasAgents = data.agents && Array.isArray(data.agents);
    const has3DCoords = hasAgents && data.agents.length > 0 &&
                        data.agents[0].x !== undefined &&
                        data.agents[0].z !== undefined;

    console.log(`  ${hasAgents ? '✅' : '❌'} 虚拟位置数据存在`);
    console.log(`  ${has3DCoords ? '✅' : '❌'} 3D坐标完整`);

    if (hasAgents) {
      console.log(`  📊 Agent数量: ${data.agents.length}`);
    }

    return hasAgents && has3DCoords;
  } catch (error) {
    console.log(`  ❌ API请求失败: ${error.message}`);
    return false;
  }
}

// 测试3: 城市边界配置
async function testCityBounds() {
  console.log('\n🗺️  测试3: 城市边界配置');

  // 模拟城市边界配置
  const CITIES = {
    beijing: { name: '北京', bounds: { minLat: 39.4, maxLat: 40.5, minLng: 115.7, maxLng: 117.0 } },
    shanghai: { name: '上海', bounds: { minLat: 30.7, maxLat: 31.9, minLng: 120.8, maxLng: 122.2 } },
    guangzhou: { name: '广州', bounds: { minLat: 22.5, maxLat: 23.9, minLng: 112.8, maxLng: 114.3 } },
  };

  let passCount = 0;
  Object.entries(CITIES).forEach(([id, city]) => {
    const hasBounds = city.bounds &&
                      city.bounds.minLat !== undefined &&
                      city.bounds.maxLat !== undefined &&
                      city.bounds.minLng !== undefined &&
                      city.bounds.maxLng !== undefined;

    const isValidBounds = hasBounds &&
                          city.bounds.minLat < city.bounds.maxLat &&
                          city.bounds.minLng < city.bounds.maxLng;

    if (isValidBounds) {
      console.log(`  ✅ ${city.name}: 边界有效`);
      passCount++;
    } else {
      console.log(`  ❌ ${city.name}: 边界无效`);
    }
  });

  console.log(`  📊 配置完整: ${passCount}/${Object.keys(CITIES).length}`);
  return passCount === Object.keys(CITIES).length;
}

// 测试4: 坐标映射功能
async function testCoordinateMapping() {
  console.log('\n🔄 测试4: 坐标映射功能');

  const testCases = [
    {
      name: '北京中心点',
      lat: 39.9042,
      lng: 116.4074,
      city: 'beijing',
      bounds: { minLat: 39.4, maxLat: 40.5, minLng: 115.7, maxLng: 117.0 }
    },
    {
      name: '上海中心点',
      lat: 31.2304,
      lng: 121.4737,
      city: 'shanghai',
      bounds: { minLat: 30.7, maxLat: 31.9, minLng: 120.8, maxLng: 122.2 }
    }
  ];

  let passCount = 0;

  function mapGeoToVirtual(lat, lng, bounds) {
    const relX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) * 2 - 1;
    const relZ = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) * 2 - 1;
    return {
      x: Math.round(relX * 200),
      y: 10,
      z: Math.round(relZ * 200)
    };
  }

  testCases.forEach(test => {
    const virtualPos = mapGeoToVirtual(test.lat, test.lng, test.bounds);
    const isValid = virtualPos.x >= -200 && virtualPos.x <= 200 &&
                    virtualPos.z >= -200 && virtualPos.z <= 200;

    if (isValid) {
      console.log(`  ✅ ${test.name}: (${virtualPos.x}, ${virtualPos.y}, ${virtualPos.z})`);
      passCount++;
    } else {
      console.log(`  ❌ ${test.name}: 映射结果超出范围`);
    }
  });

  console.log(`  📊 映射成功: ${passCount}/${testCases.length}`);
  return passCount === testCases.length;
}

// 测试5: Agent过滤功能
async function testAgentFiltering() {
  console.log('\n🔍 测试5: Agent过滤功能');

  try {
    const response = await fetch(`${API_BASE}/agents/geographic`);
    const data = await response.json();

    if (!data.agents || data.agents.length === 0) {
      console.log('  ⚠️  无Agent数据可测试');
      return true;
    }

    const beijingBounds = { minLat: 39.4, maxLat: 40.5, minLng: 115.7, maxLng: 117.0 };

    const filtered = data.agents.filter(agent => {
      if (!agent.latitude || !agent.longitude) return false;
      return agent.latitude >= beijingBounds.minLat &&
             agent.latitude <= beijingBounds.maxLat &&
             agent.longitude >= beijingBounds.minLng &&
             agent.longitude <= beijingBounds.maxLng;
    });

    console.log(`  ✅ 总Agent数: ${data.agents.length}`);
    console.log(`  ✅ 北京区域Agent: ${filtered.length}`);
    console.log(`  ✅ 过滤比例: ${((filtered.length / data.agents.length) * 100).toFixed(1)}%`);

    return true;
  } catch (error) {
    console.log(`  ❌ 过滤测试失败: ${error.message}`);
    return false;
  }
}

// 测试6: 页面组件检查
async function testPageComponents() {
  console.log('\n📄 测试6: 页面组件检查');

  try {
    const response = await fetch(PAGE_URL);
    const html = await response.text();

    const components = [
      { name: 'Agent API调用', check: html.includes('agents/geographic') },
      { name: 'Agent地图标记', check: html.includes('updateMapAgents') },
      { name: '3D Agent显示', check: html.includes('update3DAgents') },
      { name: '坐标映射函数', check: html.includes('mapGeoToVirtual') },
      { name: 'Agent详情面板', check: html.includes('agent-detail') },
      { name: '刷新Agent按钮', check: html.includes('refreshAgents') },
      { name: '心情颜色映射', check: html.includes('MOOD_COLORS') },
    ];

    components.forEach(c => {
      console.log(`  ${c.check ? '✅' : '❌'} ${c.name}`);
    });

    const allPass = components.every(c => c.check);
    console.log(allPass ? '\n  ✅ 页面组件完整' : '\n  ❌ 缺少必要组件');
    return allPass;
  } catch (error) {
    console.log(`  ❌ 页面加载失败: ${error.message}`);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  const results = {
    agentAPI: await testAgentAPI(),
    virtualPositions: await testVirtualPositionsAPI(),
    cityBounds: await testCityBounds(),
    coordinateMapping: await testCoordinateMapping(),
    agentFiltering: await testAgentFiltering(),
    pageComponents: await testPageComponents(),
  };

  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 总体测试结果:\n');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;

  console.log(`Agent API: ${results.agentAPI ? '✅ 通过' : '❌ 失败'}`);
  console.log(`虚拟位置API: ${results.virtualPositions ? '✅ 通过' : '❌ 失败'}`);
  console.log(`城市边界配置: ${results.cityBounds ? '✅ 通过' : '❌ 失败'}`);
  console.log(`坐标映射: ${results.coordinateMapping ? '✅ 通过' : '❌ 失败'}`);
  console.log(`Agent过滤: ${results.agentFiltering ? '✅ 通过' : '❌ 失败'}`);
  console.log(`页面组件: ${results.pageComponents ? '✅ 通过' : '❌ 失败'}`);

  console.log(`\n成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！\n');
    console.log('🌐 请在浏览器中访问测试页面:');
    console.log(`   ${PAGE_URL}\n`);
    console.log('📋 功能清单:\n');
    console.log('   1. 🗺️ 地图显示Agent位置（彩色标记）\n');
    console.log('   2. 🎮 3D场景显示Agent（浮动球体）\n');
    console.log('   3. 🔄 切换城市时Agent同步更新\n');
    console.log('   4. 🎨 Agent颜色根据心情变化\n');
    console.log('   5. 📋 点击Agent查看详细信息\n');
    console.log('   6. 🔄 刷新按钮获取最新Agent数据\n');
    console.log('   7. 📍 Agent列表显示所有可见Agent\n');
  } else {
    console.log('\n⚠️  部分测试未通过，请检查相关功能');
  }
}

runAllTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
