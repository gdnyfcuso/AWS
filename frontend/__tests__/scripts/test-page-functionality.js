#!/usr/bin/env node
/**
 * 页面功能自动化测试
 * 模拟浏览器操作验证所有功能
 */

const API_BASE = 'http://100.64.0.131:3000/api/v1';
const PAGE_URL = 'http://100.64.0.131:8888/test-reliable.html';

console.log('🧪 地图页面功能测试\n');
console.log('=' .repeat(60));

// 测试1: 页面可访问性
async function testPageAccessible() {
  console.log('\n📄 测试1: 页面可访问性');
  try {
    const response = await fetch(PAGE_URL);
    const html = await response.text();

    const checks = [
      { name: 'DOCTYPE声明', pass: html.includes('<!DOCTYPE html>') },
      { name: '地图容器', pass: html.includes('id="map"') },
      { name: '城市按钮', pass: html.includes('goToCity') },
      { name: 'Leaflet CSS', pass: html.includes('leaflet.css') },
      { name: '搜索框', pass: html.includes('searchInput') },
      { name: '面包屑导航', pass: html.includes('breadcrumb') },
      { name: '地图风格切换', pass: html.includes('switchLayer') },
    ];

    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPass = checks.every(c => c.pass);
    console.log(allPass ? '  ✅ 页面结构完整' : '  ❌ 页面结构有问题');
    return allPass;
  } catch (error) {
    console.log(`  ❌ 页面访问失败: ${error.message}`);
    return false;
  }
}

// 测试2: API端点验证
async function testAPIEndpoints() {
  console.log('\n🔌 测试2: API端点验证');

  const endpoints = [
    { name: '城市列表', url: '/map/cities' },
    { name: '北京子地区', url: '/map/regions/beijing/children' },
    { name: '地图视图(北京)', url: '/map/view?region_id=beijing' },
    { name: '路径导航', url: '/map/regions/zhongguancun/path' },
    { name: '搜索功能', url: '/map/search?q=西湖' },
  ];

  let passCount = 0;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(API_BASE + endpoint.url);
      const data = await response.json();
      if (data.success) {
        console.log(`  ✅ ${endpoint.name}`);
        passCount++;
      } else {
        console.log(`  ❌ ${endpoint.name} - API返回失败`);
      }
    } catch (error) {
      console.log(`  ❌ ${endpoint.name} - ${error.message}`);
    }
  }

  console.log(`  📊 通过: ${passCount}/${endpoints.length}`);
  return passCount === endpoints.length;
}

// 测试3: 地图源验证
async function testMapSources() {
  console.log('\n🗺️  测试3: 地图瓦片源验证');

  const sources = [
    { name: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/6/32/21.png' },
    { name: 'OSM热点图', url: 'https://tile.openstreetmap.fr/hot/6/32/21.png' },
    { name: '地形图', url: 'https://a.tile.opentopomap.org/6/32/21.png' },
    { name: '暗色模式', url: 'https://a.basemaps.cartocdn.com/dark_all/6/32/21.png' },
  ];

  let passCount = 0;
  for (const source of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(source.url, {
        signal: controller.signal,
        method: 'HEAD'
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`  ✅ ${source.name} - HTTP ${response.status}`);
        passCount++;
      } else {
        console.log(`  ⚠️  ${source.name} - HTTP ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`  ❌ ${source.name} - 请求超时`);
      } else {
        console.log(`  ❌ ${source.name} - ${error.message}`);
      }
    }
  }

  console.log(`  📊 可用: ${passCount}/${sources.length}`);
  return passCount > 0;
}

// 测试4: 城市数据验证
async function testCityData() {
  console.log('\n🏙️  测试4: 城市数据完整性');

  try {
    const response = await fetch(API_BASE + '/map/cities');
    const data = await response.json();

    if (!data.success) {
      console.log('  ❌ 获取城市数据失败');
      return false;
    }

    const cities = data.cities;
    console.log(`  ✅ 共有 ${cities.length} 个城市`);

    // 验证每个城市的数据
    let validCount = 0;
    cities.forEach(city => {
      const hasCoords = city.coordinates && city.coordinates.lat && city.coordinates.lng;
      const hasZoom = city.zoom && city.zoom > 0;
      const hasChildren = city.children_count !== undefined;

      if (hasCoords && hasZoom) {
        validCount++;
      } else {
        console.log(`  ⚠️  ${city.name} 数据不完整`);
      }
    });

    console.log(`  ✅ ${validCount}/${cities.length} 城市数据完整`);
    return validCount === cities.length;
  } catch (error) {
    console.log(`  ❌ 城市数据验证失败: ${error.message}`);
    return false;
  }
}

// 测试5: 导航路径验证
async function testNavigationPaths() {
  console.log('\n📍 测试5: 导航路径验证');

  const testPaths = [
    { from: '中国', to: '中关村', expected: 4 },
    { from: '中国', to: '西湖', expected: 4 },
    { from: '中国', to: '外滩', expected: 4 },
  ];

  let passCount = 0;
  for (const path of testPaths) {
    try {
      // 先搜索目标
      const searchResponse = await fetch(`${API_BASE}/map/search?q=${path.to}`);
      const searchData = await searchResponse.json();

      if (searchData.success && searchData.results.length > 0) {
        const targetId = searchData.results[0].id;

        // 获取路径
        const pathResponse = await fetch(`${API_BASE}/map/regions/${targetId}/path`);
        const pathData = await pathResponse.json();

        if (pathData.success && pathData.path.length === path.expected) {
          console.log(`  ✅ ${path.from} → ${path.to}: ${pathData.path.map(p => p.name).join(' → ')}`);
          passCount++;
        } else {
          console.log(`  ⚠️  ${path.from} → ${path.to}: 路径层级不符 (预期${path.expected}, 实际${pathData.path?.length})`);
        }
      }
    } catch (error) {
      console.log(`  ❌ ${path.from} → ${path.to}: ${error.message}`);
    }
  }

  console.log(`  📊 通过: ${passCount}/${testPaths.length}`);
  return passCount === testPaths.length;
}

// 运行所有测试
async function runAllTests() {
  const results = {
    pageAccessible: await testPageAccessible(),
    apiEndpoints: await testAPIEndpoints(),
    mapSources: await testMapSources(),
    cityData: await testCityData(),
    navigationPaths: await testNavigationPaths(),
  };

  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 总体测试结果:\n');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;

  console.log(`页面结构: ${results.pageAccessible ? '✅ 通过' : '❌ 失败'}`);
  console.log(`API端点: ${results.apiEndpoints ? '✅ 通过' : '❌ 失败'}`);
  console.log(`地图源: ${results.mapSources ? '✅ 通过' : '❌ 失败'}`);
  console.log(`城市数据: ${results.cityData ? '✅ 通过' : '❌ 失败'}`);
  console.log(`导航路径: ${results.navigationPaths ? '✅ 通过' : '❌ 失败'}`);

  console.log(`\n成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！');
    console.log('\n🌐 请在浏览器中访问:');
    console.log(`   ${PAGE_URL}\n`);
    console.log('📋 测试清单:');
    console.log('   1. 地图初始化和瓦片加载');
    console.log('   2. 点击城市按钮切换位置');
    console.log('   3. 查看子地区列表');
    console.log('   4. 切换地图风格');
    console.log('   5. 使用搜索框查找地标');
    console.log('   6. 点击面包屑导航返回上级\n');
  } else {
    console.log('\n⚠️  部分测试未通过，请检查相关功能');
  }
}

runAllTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
