import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

export interface BuildingData {
  id: string;
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number; height: number };
  color: number;
  type: 'residential' | 'commercial' | 'industrial';
}

export interface CityRendererProps {
  buildings: BuildingData[];
  onBuildingClick?: (building: BuildingData) => void;
}

export function CityRenderer({ buildings, onBuildingClick }: CityRendererProps) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 按类型分组建筑
  const buildingsByType = useMemo(() => {
    const grouped = {
      residential: [] as BuildingData[],
      commercial: [] as BuildingData[],
      industrial: [] as BuildingData[],
    };
    buildings.forEach(b => {
      if (grouped[b.type]) {
        grouped[b.type].push(b);
      }
    });
    return grouped;
  }, [buildings]);

  // 为每种类型创建 InstancedMesh
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    let index = 0;

    // 渲染每种类型的建筑
    (Object.entries(buildingsByType) as [string, BuildingData[]][]).forEach(([type, typeBuildings]) => {
      const color = {
        residential: 0x4a90d9,
        commercial: 0xd94a4a,
        industrial: 0x6b6b6b,
      }[type] || 0x888888;

      typeBuildings.forEach((building) => {
        dummy.position.set(building.position.x, building.position.y, building.position.z);
        dummy.scale.set(building.size.width, building.size.height, building.size.depth);
        dummy.updateMatrix();

        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, new THREE.Color(color));
        index++;
      });
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [buildingsByType, dummy]);

  const totalCount = buildings.length;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, totalCount]}
      onClick={(event) => {
        const instanceId = event.instanceId;
        if (instanceId !== undefined && buildings[instanceId]) {
          onBuildingClick?.(buildings[instanceId]);
        }
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={0.8}
        metalness={0.1}
      />
    </instancedMesh>
  );
}
