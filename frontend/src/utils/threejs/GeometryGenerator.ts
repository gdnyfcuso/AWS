// Three.js 几何体生成工具 - 卡通风格3D资产

import * as THREE from 'three';

/**
 * 几何体生成配置
 */
export interface GeometryGeneratorConfig {
  cartoonStyle: boolean;
  flatShading: boolean;
  vertexColors: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: GeometryGeneratorConfig = {
  cartoonStyle: true,
  flatShading: true,
  vertexColors: false,
};

/**
 * 山脉配置
 */
export interface MountainGeometryConfig {
  height: number;
  baseRadius: number;
  segments: number;
  hasSnowCap: boolean;
  snowCapHeight: number;
  roughness: number;
}

/**
 * 车辆几何体配置
 */
export interface VehicleGeometryConfig {
  type: 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle' | 'taxi';
  bodyShape: 'box' | 'rounded' | 'sedan' | 'suv';
  size: { length: number; width: number; height: number };
  hasRoof: boolean;
  windowConfig: {
    front: boolean;
    rear: boolean;
    sides: boolean;
  };
  wheelPositions: THREE.Vector3[];
  color: string;
}

/**
 * 几何体生成器类
 */
export class GeometryGenerator {
  private config: GeometryGeneratorConfig;

  constructor(config: GeometryGeneratorConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * 创建卡通风格山脉
   */
  createMountain(config: MountainGeometryConfig): THREE.Group {
    const group = new THREE.Group();

    // 主体（圆锥体）
    const bodyGeometry = new THREE.ConeGeometry(
      config.baseRadius,
      config.height,
      config.segments,
      1,
      true
    );

    // 添加一些随机性使山脉看起来更自然
    const positions = bodyGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const normalizedHeight = (y + config.height / 2) / config.height;
      const noise = (Math.random() - 0.5) * config.roughness * (1 - normalizedHeight);
      const scale = 1 + noise;
      positions.setX(i, positions.getX(i) * scale);
      positions.setZ(i, positions.getZ(i) * scale);
    }

    bodyGeometry.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(
      bodyGeometry,
      new THREE.MeshStandardMaterial({
        flatShading: this.config.flatShading,
        roughness: 0.8,
        metalness: 0.1,
      })
    );

    // 移动到正确位置（使底部在y=0）
    bodyMesh.position.y = config.height / 2;
    group.add(bodyMesh);

    // 雪顶
    if (config.hasSnowCap && config.snowCapHeight > 0) {
      const snowGeometry = new THREE.ConeGeometry(
        config.baseRadius * (config.snowCapHeight / config.height),
        config.snowCapHeight,
        config.segments,
        1,
        true
      );

      const snowMesh = new THREE.Mesh(
        snowGeometry,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          flatShading: this.config.flatShading,
          roughness: 0.9,
          metalness: 0.0,
        })
      );

      snowMesh.position.y = config.height - config.snowCapHeight / 2;
      group.add(snowMesh);
    }

    return group;
  }

  /**
   * 创建山丘
   */
  createHill(height: number, radius: number): THREE.Mesh {
    // 使用半球几何体，只创建上半部分
    const geometry = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);

    // 压扁使其看起来像山丘
    geometry.scale(1, height / radius, 1);

    const material = new THREE.MeshStandardMaterial({
      flatShading: this.config.flatShading,
      roughness: 0.7,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // 将山丘底部移动到 y=0（半球中心需要向下调整）
    mesh.position.y = 0;
    return mesh;
  }

  /**
   * 创建河流/水面
   */
  createWater(width: number, depth: number, segments: number = 32): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);

    // 添加波浪效果
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      positions.setZ(i, Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.7,
      flatShading: this.config.flatShading,
      roughness: 0.1,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.5; // 嵌入地下

    return mesh;
  }

  /**
   * 创建道路
   */
  createRoad(path: THREE.Vector3[], width: number, lanes: number): THREE.Group {
    const group = new THREE.Group();

    // 道路主体
    const shape = new THREE.Shape();
    const halfWidth = width / 2;

    shape.moveTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);

    // 沿路径创建道路
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];

      const length = start.distanceTo(end);
      const direction = new THREE.Vector3()
        .subVectors(end, start)
        .normalize();

      const geometry = new THREE.PlaneGeometry(width, length);
      const material = new THREE.MeshStandardMaterial({
        color: 0x333333,
        flatShading: this.config.flatShading,
        roughness: 0.9,
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.copy(start).add(end).multiplyScalar(0.5);
      segment.position.y = 0.1;
      segment.rotation.x = -Math.PI / 2;
      segment.rotation.z = Math.atan2(direction.x, direction.z);

      group.add(segment);

      // 添加车道标线
      if (lanes > 1) {
        const lineGeometry = new THREE.PlaneGeometry(0.3, length);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        for (let l = 1; l < lanes; l++) {
          const line = new THREE.Mesh(lineGeometry, lineMaterial);
          const offset = -halfWidth + (width / lanes) * l;
          line.position.copy(segment.position);
          line.position.x += offset * Math.cos(segment.rotation.z);
          line.position.z -= offset * Math.sin(segment.rotation.z);
          line.rotation.copy(segment.rotation);
          line.position.y = 0.11;
          group.add(line);
        }
      }
    }

    return group;
  }

  /**
   * 创建卡通风格车辆
   */
  createVehicle(config: VehicleGeometryConfig): THREE.Group {
    const group = new THREE.Group();
    const { size, color, bodyShape, hasRoof, windowConfig } = config;

    // 车身材质
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      flatShading: this.config.flatShading,
      roughness: 0.3,
      metalness: 0.6,
    });

    // 玻璃材质
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      flatShading: this.config.flatShading,
      roughness: 0.1,
      metalness: 0.9,
    });

    // 轮胎材质
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      flatShading: this.config.flatShading,
      roughness: 0.9,
    });

    let body: THREE.Mesh;

    switch (bodyShape) {
      case 'sedan':
        body = this.createSedanBody(size, bodyMaterial);
        break;
      case 'suv':
        body = this.createSUVBody(size, bodyMaterial);
        break;
      case 'box':
        body = this.createBoxBody(size, bodyMaterial);
        break;
      case 'rounded':
        body = this.createRoundedBody(size, bodyMaterial);
        break;
      default:
        body = this.createSedanBody(size, bodyMaterial);
    }

    group.add(body);

    // 添加车窗
    if (hasRoof) {
      this.addWindows(group, size, windowConfig, glassMaterial);
    }

    // 添加车轮
    for (const wheelPos of config.wheelPositions) {
      const wheel = this.createWheel(0.8, 0.5, wheelMaterial);
      wheel.position.copy(wheelPos);
      group.add(wheel);
    }

    // 添加车灯
    this.addHeadlights(group, size, bodyMaterial);

    return group;
  }

  /**
   * 创建轿车车身
   */
  private createSedanBody(size: { length: number; width: number; height: number }, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.length, size.height, size.width);

    // 修改顶部使其更圆润
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y > 0) {
        const normalizedY = y / (size.height / 2);
        const taper = 1 - (normalizedY * 0.2);
        positions.setX(i, positions.getX(i) * taper);
        positions.setZ(i, positions.getZ(i) * taper);
      }
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = size.height / 2 + 0.5;
    return mesh;
  }

  /**
   * 创建SUV车身
   */
  private createSUVBody(size: { length: number; width: number; height: number }, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.length, size.height, size.width);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = size.height / 2 + 0.5;
    return mesh;
  }

  /**
   * 创建方形车身
   */
  private createBoxBody(size: { length: number; width: number; height: number }, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.length, size.height, size.width);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = size.height / 2 + 0.5;
    return mesh;
  }

  /**
   * 创建圆润车身
   */
  private createRoundedBody(size: { length: number; width: number; height: number }, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(Math.min(size.length, size.width) / 2, 16, 8);
    geometry.scale(size.length / size.width, size.height / size.width, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = size.height / 2 + 0.5;
    return mesh;
  }

  /**
   * 添加车窗
   */
  private addWindows(
    group: THREE.Group,
    size: { length: number; width: number; height: number },
    config: { front: boolean; rear: boolean; sides: boolean },
    material: THREE.Material
  ): void {
    const windowHeight = size.height * 0.4;
    const windowWidth = size.width * 0.8;
    const windowDepth = 0.1;

    if (config.front) {
      const frontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(windowDepth, windowHeight, windowWidth),
        material
      );
      frontWindow.position.set(size.length / 4, size.height * 0.7, 0);
      frontWindow.rotation.y = Math.PI / 2;
      group.add(frontWindow);
    }

    if (config.rear) {
      const rearWindow = new THREE.Mesh(
        new THREE.BoxGeometry(windowDepth, windowHeight, windowWidth),
        material
      );
      rearWindow.position.set(-size.length / 4, size.height * 0.7, 0);
      rearWindow.rotation.y = Math.PI / 2;
      group.add(rearWindow);
    }

    if (config.sides) {
      const sideWindowLength = size.length * 0.4;
      const sideWindow = new THREE.Mesh(
        new THREE.BoxGeometry(sideWindowLength, windowHeight, windowDepth),
        material
      );
      sideWindow.position.set(0, size.height * 0.7, size.width / 2);
      group.add(sideWindow);

      const sideWindow2 = sideWindow.clone();
      sideWindow2.position.z = -size.width / 2;
      group.add(sideWindow2);
    }
  }

  /**
   * 创建车轮
   */
  private createWheel(radius: number, width: number, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius, width, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  /**
   * 添加车灯
   */
  private addHeadlights(
    group: THREE.Group,
    size: { length: number; width: number; height: number },
    _material: THREE.Material
  ): void {
    const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });

    const positions = [
      { x: size.length / 2, y: size.height * 0.4, z: size.width / 3 },
      { x: size.length / 2, y: size.height * 0.4, z: -size.width / 3 },
    ];

    for (const pos of positions) {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(pos.x, pos.y, pos.z);
      group.add(light);
    }
  }

  /**
   * 创建地面
   */
  createGround(size: number, color: number = 0x7cfc00): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(size, size, 64, 64);

    // 添加一些起伏
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 2;
      positions.setZ(i, height);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color,
      flatShading: this.config.flatShading,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    return mesh;
  }

  /**
   * 创建实例化网格（用于批量渲染）
   */
  createInstancedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
    positions: THREE.Vector3[],
    scales?: THREE.Vector3[],
    rotations?: THREE.Euler[]
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, count);

    const matrix = new THREE.Matrix4();

    for (let i = 0; i < count && i < positions.length; i++) {
      matrix.setPosition(positions[i]);
      if (scales && scales[i]) {
        matrix.scale(scales[i]);
      }
      if (rotations && rotations[i]) {
        matrix.makeRotationFromEuler(rotations[i]);
        matrix.setPosition(positions[i]);
      }
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  /**
   * 创建LOD（细节层次）对象
   */
  createLOD(
    high: THREE.Object3D,
    medium: THREE.Object3D,
    low: THREE.Object3D,
    distances: [number, number, number] = [50, 100, 200]
  ): THREE.LOD {
    const lod = new THREE.LOD();
    lod.addLevel(high, distances[0]);
    lod.addLevel(medium, distances[1]);
    lod.addLevel(low, distances[2]);
    return lod;
  }
}

// 导出单例
export const geometryGenerator = new GeometryGenerator();
