import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useViewState } from '../../stores/viewState';
import { CityRenderer, BuildingData } from '../renderers/CityRenderer';

interface MacroViewProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
}

// 模拟城市数据
const mockBuildings: BuildingData[] = Array.from({ length: 500 }, (_, i) => ({
  id: `building-${i}`,
  position: {
    x: (Math.random() - 0.5) * 400,
    y: 0,
    z: (Math.random() - 0.5) * 400,
  },
  size: {
    width: 5 + Math.random() * 15,
    depth: 5 + Math.random() * 15,
    height: 10 + Math.random() * 80,
  },
  color: 0x888888,
  type: ['residential', 'commercial', 'industrial'][Math.floor(Math.random() * 3)] as any,
}));

export function MacroView({ scene, camera }: MacroViewProps) {
  const { setViewMode } = useViewState();
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingData | null>(null);

  const groundRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!scene || !camera) return;

    // 设置相机到宏观视角位置
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(200, 200, 200);
      camera.lookAt(0, 0, 0);
    }
  }, [scene, camera]);

  const handleBuildingClick = (building: BuildingData) => {
    console.log('Building clicked:', building);
    setHoveredBuilding(building);
    // 可以在这里触发切换到微观视角
  };

  return (
    <group>
      {/* 地面 */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.9} />
      </mesh>

      {/* 区域颜色编码 */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
        />
      </mesh>

      {/* 城市建筑 */}
      <CityRenderer
        buildings={mockBuildings}
        onBuildingClick={handleBuildingClick}
      />

      {/* 悬停信息面板 */}
      {hoveredBuilding && (
        <div
          className="absolute bg-white/90 p-3 rounded shadow-lg pointer-events-none"
          style={{
            left: '50%',
            top: '20px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-sm font-semibold">{hoveredBuilding.id}</div>
          <div className="text-xs text-gray-600">类型: {hoveredBuilding.type}</div>
          <div className="text-xs text-gray-600">
            高度: {Math.round(hoveredBuilding.size.height)}m
          </div>
        </div>
      )}
    </group>
  );
}
