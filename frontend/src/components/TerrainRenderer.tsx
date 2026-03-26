// 地形渲染组件 - 使用Three.js渲染北京地形

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Group, Object3D } from 'three';
import { geometryGenerator } from '../utils/threejs/GeometryGenerator';
import { CARTOON_COLORS } from '../utils/threejs/MaterialFactory';

/**
 * 地形特征数据接口（与后端 TerrainFeature 类型保持一致）
 */
export interface TerrainFeatureData {
  id: string;
  feature_id?: string;
  type: 'mountain' | 'hill' | 'water' | 'river' | 'plain' | 'forest' | 'ocean';
  name?: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  realCoordinates?: { lat: number; lng: number };
  metadata?: Record<string, unknown>;
}

/**
 * 地形渲染器属性
 */
export interface TerrainRendererProps {
  features?: TerrainFeatureData[];
  onTerrainClick?: (feature: TerrainFeatureData) => void;
  enabled?: boolean;
  cartoonStyle?: boolean;
}

/**
 * 地形渲染组件
 */
export function TerrainRenderer({
  features = [],
  onTerrainClick,
  enabled = true,
  cartoonStyle = true,
}: TerrainRendererProps) {
  const groupRef = useRef<Group | null>(null);
  const mountainsRef = useRef<Group | null>(null);
  const hillsRef = useRef<Group | null>(null);
  const waterRef = useRef<Group | null>(null);
  const groundRef = useRef<Object3D | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // 创建地形组
    const terrainGroup = new THREE.Group();
    terrainGroup.name = 'TerrainGroup';

    // 创建地面
    const ground = createGround();
    groundRef.current = ground;
    terrainGroup.add(ground);

    // 创建地形特征组
    const mountainsGroup = new THREE.Group();
    mountainsGroup.name = 'MountainsGroup';
    mountainsRef.current = mountainsGroup;
    terrainGroup.add(mountainsGroup);

    const hillsGroup = new THREE.Group();
    hillsGroup.name = 'HillsGroup';
    hillsRef.current = hillsGroup;
    terrainGroup.add(hillsGroup);

    const waterGroup = new THREE.Group();
    waterGroup.name = 'WaterGroup';
    waterRef.current = waterGroup;
    terrainGroup.add(waterGroup);

    groupRef.current = terrainGroup;

    return () => {
      // 清理资源
      terrainGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    };
  }, [enabled]);

  // 渲染地形特征
  useEffect(() => {
    if (!groupRef.current || !mountainsRef.current || !hillsRef.current || !waterRef.current) return;

    // 清空现有特征
    clearGroup(mountainsRef.current);
    clearGroup(hillsRef.current);
    clearGroup(waterRef.current);

    // 渲染特征
    features.forEach((feature) => {
      const mesh = createTerrainFeature(feature, cartoonStyle);
      if (mesh) {
        switch (feature.type) {
          case 'mountain':
            mountainsRef.current!.add(mesh);
            break;
          case 'hill':
            hillsRef.current!.add(mesh);
            break;
          case 'water':
          case 'river':
            waterRef.current!.add(mesh);
            break;
        }
      }
    });
  }, [features, cartoonStyle]);

  /**
   * 创建地面
   */
  function createGround(): THREE.Mesh {
    const groundSize = 1000;
    const ground = geometryGenerator.createGround(groundSize, CARTOON_COLORS.grass);
    ground.name = 'Ground';
    ground.receiveShadow = true;
    return ground;
  }

  /**
   * 创建地形特征
   */
  function createTerrainFeature(feature: TerrainFeatureData, cartoon: boolean): THREE.Object3D | null {
    switch (feature.type) {
      case 'mountain':
        return createMountain(feature, cartoon);
      case 'hill':
        return createHill(feature);
      case 'water':
        return createWater(feature);
      case 'river':
        return createRiver(feature);
      default:
        return null;
    }
  }

  /**
   * 创建山脉
   */
  function createMountain(feature: TerrainFeatureData, cartoon: boolean): THREE.Object3D {
    const metadata = feature.metadata as Record<string, unknown> | undefined;
    const hasSnowCap = metadata?.hasSnowCap as boolean ?? false;
    const snowCapHeight = metadata?.snowCapHeight as number ?? 50;
    const roughness = metadata?.roughness as number ?? 0.7;
    const color = metadata?.color as string | undefined;

    const mountainGroup = geometryGenerator.createMountain({
      height: feature.size.height,
      baseRadius: feature.size.width / 2,
      segments: cartoon ? 8 : 16,
      hasSnowCap,
      snowCapHeight,
      roughness,
    });

    // 应用颜色
    if (color) {
      mountainGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (!hasSnowCap || child.position.y < feature.size.height - snowCapHeight) {
            child.material.color.set(color);
          }
        }
      });
    }

    mountainGroup.position.set(feature.position.x, feature.position.y, feature.position.z);
    mountainGroup.name = feature.name || `Mountain_${feature.id}`;
    mountainGroup.castShadow = true;
    mountainGroup.receiveShadow = true;

    // 添加点击事件
    if (onTerrainClick) {
      mountainGroup.userData = { feature, onClick: () => onTerrainClick(feature) };
    }

    return mountainGroup;
  }

  /**
   * 创建山丘
   */
  function createHill(feature: TerrainFeatureData): THREE.Object3D {
    const metadata = feature.metadata as Record<string, unknown> | undefined;
    const color = metadata?.color as string | undefined;

    const hill = geometryGenerator.createHill(
      feature.size.height,
      feature.size.width / 2
    );

    if (color) {
      (hill.material as THREE.MeshStandardMaterial).color.set(color);
    }

    hill.position.set(feature.position.x, feature.position.y, feature.position.z);
    hill.name = feature.name || `Hill_${feature.id}`;
    hill.castShadow = true;
    hill.receiveShadow = true;

    // 添加点击事件
    if (onTerrainClick) {
      hill.userData = { feature, onClick: () => onTerrainClick(feature) };
    }

    return hill;
  }

  /**
   * 创建水域
   */
  function createWater(feature: TerrainFeatureData): THREE.Object3D {
    const metadata = feature.metadata as Record<string, unknown> | undefined;
    const transparency = metadata?.transparency as number ?? 0.7;
    const color = metadata?.color as string | undefined;

    const water = geometryGenerator.createWater(
      feature.size.width,
      feature.size.depth,
      32
    );

    if (color) {
      (water.material as THREE.MeshStandardMaterial).color.set(color);
    }
    (water.material as THREE.MeshStandardMaterial).opacity = transparency;

    water.position.set(feature.position.x, feature.position.y, feature.position.z);
    water.name = feature.name || `Water_${feature.id}`;
    water.receiveShadow = true;

    // 添加点击事件
    if (onTerrainClick) {
      water.userData = { feature, onClick: () => onTerrainClick(feature) };
    }

    return water;
  }

  /**
   * 创建河流
   */
  function createRiver(feature: TerrainFeatureData): THREE.Object3D {
    const metadata = feature.metadata as Record<string, unknown> | undefined;
    const path = metadata?.path as THREE.Vector3[] | undefined;
    const width = metadata?.width as number ?? 15;
    const transparency = metadata?.transparency as number ?? 0.6;
    const color = metadata?.color as string | undefined;

    const riverGroup = new THREE.Group();

    if (path && path.length > 1) {
      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];

        const segment = geometryGenerator.createWater(
          width,
          start.distanceTo(end) * 2,
          16
        );

        if (color) {
          (segment.material as THREE.MeshStandardMaterial).color.set(color);
        }
        (segment.material as THREE.MeshStandardMaterial).opacity = transparency;

        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;
        segment.position.set(midX, 0.5, midZ);

        const angle = Math.atan2(end.z - start.z, end.x - start.x);
        segment.rotation.y = angle;

        riverGroup.add(segment);
      }
    } else {
      // 如果没有路径数据，创建一个简单的水面
      const water = geometryGenerator.createWater(
        feature.size.width,
        feature.size.depth,
        32
      );

      if (color) {
        (water.material as THREE.MeshStandardMaterial).color.set(color);
      }
      (water.material as THREE.MeshStandardMaterial).opacity = transparency;

      water.position.set(feature.position.x, feature.position.y, feature.position.z);
      riverGroup.add(water);
    }

    riverGroup.name = feature.name || `River_${feature.id}`;
    riverGroup.receiveShadow = true;

    // 添加点击事件
    if (onTerrainClick) {
      riverGroup.userData = { feature, onClick: () => onTerrainClick(feature) };
    }

    return riverGroup;
  }

  /**
   * 清空组
   */
  function clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      group.remove(child);
    }
  }

  // 组件不渲染任何内容，通过ref获取Three.js对象
  return null;
}

/**
 * 获取地形渲染组的Hook
 */
export function useTerrainGroup() {
  const groupRef = useRef<Group | null>(null);

  const setTerrainGroup = (group: Group) => {
    groupRef.current = group;
  };

  const getTerrainGroup = () => groupRef.current;

  return { setTerrainGroup, getTerrainGroup };
}
