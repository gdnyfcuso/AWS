# 城市级地图加载系统 - 1:1真实地形还原方案

## 需求分析

1. **按城市加载地图**: 根据Agent所在的城市/地理位置，只加载该城市的地图数据
2. **1:1比例还原**: 3D效果与真实地图保持比例和地形效果1:1还原

## 实现方案

### 第一阶段: 城市配置系统

#### 1.1 城市数据模型
```prisma
model City {
  id                  String   @id @default(cuid())
  city_id             String   @unique
  name                String
  name_en             String?

  // 地理边界
  min_lat             Float
  max_lat             Float
  min_lng             Float
  max_lng             Float

  // 中心点
  center_lat          Float
  center_lng          Float

  // 虚拟空间配置 (1:1比例)
  virtual_scale        Float    @default(1.0)  // 1单位 = 1米
  virtual_center_x    Float
  virtual_center_z    Float

  // 地形数据源
  elevation_api       String?  // Google Elevation / OpenTopography
  terrain_source      String?  // 'generated' | 'real_data'

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

#### 1.2 中国主要城市配置
```typescript
// 城市配置数据
const CITIES_CONFIG = {
  beijing: {
    name: '北京',
    name_en: 'Beijing',
    center: { lat: 39.9042, lng: 116.4074 },
    bounds: {
      minLat: 39.4,
      maxLat: 41.05,
      minLng: 115.4,
      maxLng: 117.5
    },
    // 城区配置
    districts: [
      { name: '朝阳区', center: { lat: 39.9219, lng: 116.4436 } },
      { name: '海淀区', center: { lat: 39.9593, lng: 116.2985 } },
      { name: '东城区', center: { lat: 39.9289, lng: 116.4203 } },
      { name: '西城区', center: { lat: 39.9139, lng: 116.3668 } },
      // ...
    ]
  },
  shanghai: {
    name: '上海',
    center: { lat: 31.2304, lng: 121.4737 },
    bounds: { minLat: 30.68, maxLat: 31.88, minLng: 120.86, maxLng: 122.24 },
    virtual_scale: 1.0,
  },
  guangzhou: {
    name: '广州',
    center: { lat: 23.1291, lng: 113.2644 },
    bounds: { minLat: 22.5, maxLat: 23.9, minLng: 112.9, maxLng: 114.6 },
    virtual_scale: 1.0,
  },
  shenzhen: {
    name: '深圳',
    center: lat: 22.5431, lng: 114.0579,
    bounds: { minLat: 22.45, maxLat: 22.86, minLng: 113.76, maxLng: 114.62 },
    virtual_scale: 1.0,
  },
  // ... 更多城市
};
```

### 第二阶段: 真实地形数据获取

#### 2.1 地形数据源选择
1. **Google Elevation API** (推荐) - 高精度、覆盖全球
   - 免费额度: 500米/月
   - 精度: 每个点 0.53米间隔

2. **OpenTopography** - 开源高程数据
   - SRTM (30米精度)
   - AWS Terrain Tiles (10米精度)
   - 覆盖全球

3. **Open Elevation API**
   - 融合多个数据源
   - 免费无限制

#### 2.2 实现1:1比例坐标系
```typescript
// 1:1 比例配置
const SCALE_1_TO_1 = {
  metersPerUnit: 1,        // 1虚拟单位 = 1米
  unitsPerKilometer: 1000,  // 1公里 = 1000单位
};

// 经纬度转换公式 (1:1比例)
// 北京地区: 1度纬度 ≈ 111km, 1度经度 ≈ 85km (在39.9°N)
function latLngToMeters(lat: number, lng: number, centerLat: number, centerLng: number) {
  const latMeters = (lat - centerLat) * 111000;  // 纬度每度约111km
  const lngMeters = (lng - centerLng) * 111000 * Math.cos(centerLat * Math.PI / 180);

  return { x: lngMeters, z: -latMeters };  // x向东, z向北(负)
}

// 3D空间配置 (1:1比例)
// 北京市中心(天安门)为原点
// 城市中心位置映射到 (0, 0)
// 城市范围约50km x 50km = 50000单位 x 50000单位
```

#### 2.3 地形数据获取服务
```typescript
class RealTerrainService {
  // 获取区域海拔数据
  async fetchElevation(
    bounds: { minLat, maxLat, minLng, maxLng },
    resolution: number = 30  // 网格间隔(米)
  ): Promise<ElevationPoint[]> {
    // 使用 Google Elevation API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?` +
      `path=${this.encodePath(bounds)}&samples=${this.calculateSamples(bounds, resolution)}`
    );
    return response.results.map(r => ({
      lat: r.location.lat,
      lng: r.location.lng,
      elevation: r.elevation,  // 米
    }));
  }

  // 获取地形特征
  async fetchTerrainFeatures(cityId: string, bounds: any): Promise<TerrainFeature[]> {
    // 1. 获取高程数据
    const elevationPoints = await this.fetchElevation(bounds);

    // 2. 生成地形特征
    const features = this.generateTerrainFromElevation(elevationPoints);

    return features;
  }
}
```

### 第三阶段: 动态地形加载系统

#### 3.1 城市地形API
```
GET /api/v1/world3d/cities/:city_id/terrain
GET /api/v1/world3d/agent/:agent_id/terrain  // 根据Agent的城市
```

#### 3.2 地形生成逻辑
```typescript
class CityTerrainSystem {
  async getCityTerrain(cityName: string): Promise<TerrainData> {
    // 1. 查询城市配置
    const city = await this.getCityConfig(cityName);
    if (!city) {
      city = await this.createCityFromGeoLocation(bounds);
    }

    // 2. 检查是否已有缓存的地形数据
    let terrain = await this.getCachedTerrain(city.id);
    if (!terrain) {
      // 3. 获取真实地形数据
      terrain = await this.generateCityTerrain(city);
      await this.cacheTerrain(city.id, terrain);
    }

    return terrain;
  }

  async generateCityTerrain(city: City): Promise<TerrainData> {
    const { bounds, center, virtual_scale } = city;

    // 1. 获取高程数据
    const elevationData = await this.realTerrainService.fetchElevation(bounds, 30);

    // 2. 生成地形特征
    const mountains = this.generateMountains(elevationData, bounds);
    const rivers = this.generateRivers(elevationData, bounds);
    const plains = this.generatePlains(elevationData, bounds);

    return { mountains, rivers, plains, elevationData };
  }
}
```

### 第四阶段: 前端适配

#### 4.1 根据Agent城市加载地形
```typescript
// hooks/useCityTerrain.ts
export function useCityTerrain(agentId?: string) {
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const fetchCityTerrain = async () => {
      const response = await fetch(
        getApiUrl(`/api/v1/world3d/agent/${agentId}/terrain`)
      );
      const data = await response.json();
      setTerrainData(data.data);
    };

    fetchCityTerrain();
    const interval = setInterval(fetchCityTerrain, 30000); // 30秒刷新
    return () => clearInterval(interval);
  }, [agentId]);

  return { terrainData, loading: !terrainData };
}
```

#### 4.2 1:1比例渲染
```typescript
// 3D空间配置 (1:1比例)
const REALISTIC_CONFIG = {
  scale: 1,  // 1单位 = 1米
  gridSize: 1000,  // 1km x 1km 网格
  maxHeight: 3000,  // 最大高度(米)
  waterLevel: 0,    // 海平面
};

// 相机配置
const CAMERA_CONFIG = {
  defaultPosition: { x: 0, y: 500, z: 1000 },  // 500米高空, 1km远
  farClip: 50000,  // 50公里可视距离
  nearClip: 1,
};
```

### 第五阶段: 真实地形渲染

#### 5.1 地形Mesh生成
```typescript
// 基于真实高程数据生成Mesh
function createRealisticTerrainMesh(elevationData: ElevationPoint[], bounds: Bounds): THREE.Group {
  const geometry = new THREE.PlaneGeometry(
    bounds.width,
    bounds.depth,
    elevationData.length,
    elevationData.length
  );

  // 设置顶点高度
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < elevationData.length; i++) {
    vertices[i * 3 + 2] = elevationData[i].elevation; // y轴高度
  }

  // 计算法线
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
  });

  return new THREE.Mesh(geometry, material);
}
```

### 实施步骤

#### 第1步: 创建城市配置和数据库模型
- [ ] 更新 Prisma schema 添加 City 模型
- [ ] 创建城市配置文件 (cities.ts)
- [ ] 添加数据库迁移

#### 第2步: 实现真实地形数据服务
- [ ] 创建 RealTerrainService
- [ ] 集成 Google Elevation API 或 OpenTopography
- [ ] 实现高程数据缓存

#### 第3步: 重构地形生成系统
- [ ] 更新 TerrainSystem 支持城市级地形
- [ ] 实现基于高程数据的地形特征生成
- [ ] 添加地形数据缓存

#### 第4步: 创建城市地形API
- [ ] POST /api/v1/world3d/cities/:city/terrain
- [ ] GET /api/v1/world3d/agent/:agent_id/terrain
- [ ] GET /api/v1/world3d/cities (list)

#### 第5步: 前端适配
- [ ] 创建 useCityTerrain hook
- [ ] 更新 VirtualSpace3D 支持动态地形
- [ ] 实现城市切换UI
- [ ] 1:1比例渲染配置

#### 第6步: 测试与优化
- [ ] 北京地形测试
- [ ] 多城市切换测试
- [ ] 性能优化 (LOD, 实例化渲染)
