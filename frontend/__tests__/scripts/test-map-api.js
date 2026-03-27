#!/usr/bin/env node
/**
 * 地图API自动化测试脚本
 * 运行: node test-map-api.js
 */

const API_BASE = 'http://100.64.0.131:3000/api/v1';

const tests = [
  {
    name: '获取所有城市',
    url: '/map/cities',
    validate: (data) => {
      if (!data.success) return { pass: false, msg: 'API返回失败' };
      if (!data.cities || data.cities.length === 0) return { pass: false, msg: '城市列表为空' };
      return { pass: true, msg: `✅ 找到 ${data.cities.length} 个城市` };
    }
  },
  {
    name: '获取北京的区县',
    url: '/map/regions/beijing/children',
    validate: (data) => {
      if (!data.success || !data.children) return { pass: false, msg: '获取子地区失败' };
      return { pass: true, msg: `✅ 北京有 ${data.children.length} 个区县: ${data.children.map(c => c.name).join(', ')}` };
    }
  },
  {
    name: '获取朝阳区的地标',
    url: '/map/regions/chaoyang/children',
    validate: (data) => {
      if (!data.success || !data.children) return { pass: false, msg: '获取地标失败' };
      return { pass: true, msg: `✅ 朝阳区地标: ${data.children.map(c => c.name).join(', ')}` };
    }
  },
  {
    name: '地图视图API(三里屯)',
    url: '/map/view?region_id=sanlitun',
    validate: (data) => {
      if (!data.success || !data.view) return { pass: false, msg: '获取视图失败' };
      const { center, zoom } = data.view;
      return { pass: true, msg: `✅ 三里屯位置: (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}), 缩放: ${zoom}` };
    }
  },
  {
    name: '搜索功能(中关村)',
    url: '/map/search?q=中关村',
    validate: (data) => {
      if (!data.success) return { pass: false, msg: '搜索失败' };
      return { pass: true, msg: `✅ 搜索到 ${data.count} 个结果: ${data.results.map(r => r.name).join(', ')}` };
    }
  },
  {
    name: '路径导航(中关村)',
    url: '/map/regions/zhongguancun/path',
    validate: (data) => {
      if (!data.success || !data.path) return { pass: false, msg: '获取路径失败' };
      return { pass: true, msg: `✅ 路径: ${data.path.map(p => p.name).join(' → ')}` };
    }
  },
  {
    name: '海淀区地标',
    url: '/map/regions/haidian/children',
    validate: (data) => {
      if (!data.success || !data.children) return { pass: false, msg: '获取失败' };
      return { pass: true, msg: `✅ 海淀区: ${data.children.map(c => c.name).join(', ')}` };
    }
  },
  {
    name: '上海区县',
    url: '/map/regions/shanghai/children',
    validate: (data) => {
      if (!data.success || !data.children) return { pass: false, msg: '获取失败' };
      return { pass: true, msg: `✅ 上海区县: ${data.children.map(c => c.name).join(', ')}` };
    }
  },
  {
    name: '搜索西湖',
    url: '/map/search?q=西湖',
    validate: (data) => {
      if (!data.success) return { pass: false, msg: '搜索失败' };
      return { pass: true, msg: `✅ 找到: ${data.results.map(r => `${r.name}(${r.description})`).join(', ')}` };
    }
  },
  {
    name: '成都详情',
    url: '/map/regions/chengdu',
    validate: (data) => {
      if (!data.success || !data.region) return { pass: false, msg: '获取详情失败' };
      const { region } = data;
      return { pass: true, msg: `✅ 成都: ${region.description}, ${region.stats?.districtCount || 0}区${region.stats?.villageCount || 0}地标` };
    }
  }
];

async function runTest(test) {
  try {
    const response = await fetch(API_BASE + test.url);
    const data = await response.json();
    return test.validate(data);
  } catch (error) {
    return { pass: false, msg: `❌ 请求失败: ${error.message}` };
  }
}

async function main() {
  console.log('🧪 地图API自动化测试\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`测试: ${test.name}... `);
    const result = await runTest(test);

    if (result.pass) {
      console.log(result.msg);
      passed++;
    } else {
      console.log(result.msg);
      failed++;
    }
  }

  console.log('=' .repeat(60));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log(`成功率: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 所有测试通过！\n');
    console.log('🌐 请在浏览器中访问测试页面:');
    console.log('   http://100.64.0.131:8888/test-fixed.html\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
