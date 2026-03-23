// Three.js 材质工厂 - 卡通风格材质

import * as THREE from 'three';

/**
 * 材质类型
 */
export type MaterialType =
  | 'mountain'
  | 'mountain_snow'
  | 'hill'
  | 'water'
  | 'road'
  | 'grass'
  | 'dirt'
  | 'rock'
  | 'building'
  | 'vehicle'
  | 'glass'
  | 'tree'
  | 'custom';

/**
 * 材质配置
 */
export interface MaterialConfig {
  type: MaterialType;
  color?: number | string;
  flatShading?: boolean;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
}

/**
 * 预定义颜色（卡通风格）
 */
export const CARTOON_COLORS = {
  // 地形
  grass: 0x7cfc00,
  grass_dark: 0x6ab04c,
  dirt: 0x8b4513,
  rock: 0x808080,
  rock_dark: 0x696969,
  mountain: 0xa0522d,
  mountain_light: 0xcd853f,
  snow: 0xffffff,
  water: 0x4fc3f7,
  water_deep: 0x0288d1,

  // 道路
  road: 0x333333,
  road_line: 0xffffff,
  sidewalk: 0x999999,

  // 建筑
  building: 0xe8d5b7,
  building_roof: 0xc41e3a,
  building_window: 0x87ceeb,

  // 车辆（鲜艳的卡通色）
  car_red: 0xff6b6b,
  car_blue: 0x4ecdc4,
  car_yellow: 0xffd93d,
  car_green: 0x95e1d3,
  car_purple: 0x9b59b6,
  car_orange: 0xff8c42,
  car_pink: 0xff69b4,

  // 自然
  tree_trunk: 0x8b4513,
  tree_leaves: 0x228b22,
  tree_leaves_fall: 0xffd700,

  // 特效
  glow: 0xffff00,
  highlight: 0x00ffff,
} as const;

/**
 * 材质工厂类
 */
export class MaterialFactory {
  private materials: Map<string, THREE.Material> = new Map();
  private cacheEnabled = true;

  /**
   * 创建或获取材质
   */
  getMaterial(config: MaterialConfig): THREE.Material {
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(config);
      if (this.materials.has(cacheKey)) {
        return this.materials.get(cacheKey)!;
      }
    }

    const material = this.createMaterial(config);

    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(config);
      this.materials.set(cacheKey, material);
    }

    return material;
  }

  /**
   * 创建材质
   */
  private createMaterial(config: MaterialConfig): THREE.Material {
    const baseConfig: THREE.MeshStandardMaterialParameters = {
      flatShading: config.flatShading ?? true,
      roughness: config.roughness ?? 0.7,
      metalness: config.metalness ?? 0.1,
      transparent: config.transparent ?? false,
      opacity: config.opacity ?? 1,
    };

    // 设置颜色
    if (config.color !== undefined) {
      baseConfig.color = new THREE.Color(config.color);
    }

    // 设置自发光
    if (config.emissive !== undefined) {
      baseConfig.emissive = new THREE.Color(config.emissive);
      baseConfig.emissiveIntensity = config.emissiveIntensity ?? 1;
    }

    // 根据类型创建特定材质
    switch (config.type) {
      case 'mountain':
        return this.createMountainMaterial(config.color);
      case 'mountain_snow':
        return this.createSnowMaterial();
      case 'hill':
        return this.createHillMaterial(config.color);
      case 'water':
        return this.createWaterMaterial();
      case 'road':
        return this.createRoadMaterial();
      case 'grass':
        return this.createGrassMaterial();
      case 'building':
        return this.createBuildingMaterial(config.color);
      case 'vehicle':
        return this.createVehicleMaterial(config.color);
      case 'glass':
        return this.createGlassMaterial();
      case 'tree':
        return this.createTreeMaterial();
      default:
        return new THREE.MeshStandardMaterial(baseConfig);
    }
  }

  /**
   * 创建山地材质
   */
  private createMountainMaterial(color?: number | string): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: color ?? CARTOON_COLORS.mountain,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.05,
    });
  }

  /**
   * 创建雪材质
   */
  private createSnowMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: CARTOON_COLORS.snow,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  /**
   * 创建山丘材质
   */
  private createHillMaterial(color?: number | string): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: color ?? CARTOON_COLORS.grass_dark,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.05,
    });
  }

  /**
   * 创建水材质
   */
  private createWaterMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: CARTOON_COLORS.water,
      transparent: true,
      opacity: 0.7,
      flatShading: true,
      roughness: 0.1,
      metalness: 0.3,
    });
  }

  /**
   * 创建道路材质
   */
  private createRoadMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: CARTOON_COLORS.road,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.0,
    });
  }

  /**
   * 创建草地材质
   */
  private createGrassMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: CARTOON_COLORS.grass,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.0,
    });
  }

  /**
   * 创建建筑材质
   */
  private createBuildingMaterial(color?: number | string): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: color ?? CARTOON_COLORS.building,
      flatShading: true,
      roughness: 0.6,
      metalness: 0.2,
    });
  }

  /**
   * 创建车辆材质
   */
  private createVehicleMaterial(color?: number | string): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: color ?? CARTOON_COLORS.car_blue,
      flatShading: true,
      roughness: 0.3,
      metalness: 0.7,
    });
  }

  /**
   * 创建玻璃材质
   */
  private createGlassMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: CARTOON_COLORS.building_window,
      transparent: true,
      opacity: 0.5,
      flatShading: true,
      roughness: 0.1,
      metalness: 0.9,
    });
  }

  /**
   * 创建树木材质
   */
  private createTreeMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: CARTOON_COLORS.tree_leaves,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.0,
    });
  }

  /**
   * 创建轮廓线材质（用于卡通轮廓效果）
   */
  createOutlineMaterial(): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
    });
  }

  /**
   * 创建发光材质
   */
  createGlowMaterial(color: number | string = CARTOON_COLORS.glow, intensity: number = 1): THREE.Material {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5 * intensity,
    });
  }

  /**
   * 创建自定义颜色材质
   */
  createCustomMaterial(color: number | string, config: Partial<MaterialConfig> = {}): THREE.Material {
    return this.getMaterial({
      type: 'custom',
      color,
      ...config,
    });
  }

  /**
   * 获取预设材质（常用场景）
   */
  getPresetMaterial(preset: keyof typeof CARTOON_COLORS): THREE.Material {
    return this.getMaterial({
      type: 'custom',
      color: CARTOON_COLORS[preset],
    });
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(config: MaterialConfig): string {
    return `${config.type}_${config.color}_${config.flatShading}_${config.roughness}_${config.metalness}`;
  }

  /**
   * 清空材质缓存
   */
  clearCache(): void {
    this.materials.clear();
  }

  /**
   * 启用/禁用材质缓存
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * 获取所有预设颜色
   */
  getColors(): typeof CARTOON_COLORS {
    return CARTOON_COLORS;
  }

  /**
   * 随机获取一个卡通车辆颜色
   */
  getRandomVehicleColor(): number {
    const colors = [
      CARTOON_COLORS.car_red,
      CARTOON_COLORS.car_blue,
      CARTOON_COLORS.car_yellow,
      CARTOON_COLORS.car_green,
      CARTOON_COLORS.car_purple,
      CARTOON_COLORS.car_orange,
      CARTOON_COLORS.car_pink,
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 创建渐变材质（用于特殊效果）
   */
  createGradientMaterial(
    color1: number | string,
    color2: number | string,
    direction: 'horizontal' | 'vertical' = 'vertical'
  ): THREE.ShaderMaterial {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);

    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: c1 },
        color2: { value: c2 },
        direction: { value: direction === 'horizontal' ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float direction;
        varying vec2 vUv;
        void main() {
          float mixFactor = direction > 0.5 ? vUv.x : vUv.y;
          gl_FragColor = vec4(mix(color1, color2, mixFactor), 1.0);
        }
      `,
    });
  }
}

// 导出单例
export const materialFactory = new MaterialFactory();

