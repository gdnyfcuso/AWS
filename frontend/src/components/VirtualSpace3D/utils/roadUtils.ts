/**
 * 道路渲染工具函数
 */

import * as THREE from 'three';
import { CARTOON_COLORS } from '../../../utils/threejs/MaterialFactory';

/**
 * 根据道路类型获取颜色
 */
export function getRoadColor(type: string): number {
  if (!type) {
    console.warn('[RoadUtils] Road type is missing, using default color');
    return CARTOON_COLORS.road;
  }

  switch (type) {
    case 'highway':
      return 0x2d2d2d;
    case 'ring_road':
      return 0x3a3a3a;
    case 'main_road':
      return 0x404040;
    case 'secondary_road':
      return 0x4a4a4a;
    case 'alley':
      return 0x555555;
    default:
      console.warn(`[RoadUtils] Unknown road type: "${type}", using default color`);
      return CARTOON_COLORS.road;
  }
}

/**
 * 添加车道标线
 */
export function addLaneMarkings(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  lanes: number,
  angle: number
): void {
  const lineWidth = 0.3;
  const lineLength = 3;

  for (let i = 1; i < lanes; i++) {
    const offset = -width / 2 + (width / lanes) * i;

    const segments = Math.ceil(start.distanceTo(end) / lineLength);
    for (let j = 0; j < segments; j += 2) {
      const t = j / segments;
      const nextT = Math.min((j + 1) / segments, 1);

      const lineStart = new THREE.Vector3().lerpVectors(start, end, t);
      const lineEnd = new THREE.Vector3().lerpVectors(start, end, nextT);

      const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineStart.distanceTo(lineEnd));
      const lineMaterial = new THREE.MeshBasicMaterial({ color: CARTOON_COLORS.road_line });
      const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);

      const midX = (lineStart.x + lineEnd.x) / 2;
      const midZ = (lineStart.z + lineEnd.z) / 2;

      lineMesh.position.set(midX, 0.16, midZ);
      lineMesh.position.x += offset * Math.cos(angle);
      lineMesh.position.z -= offset * Math.sin(angle);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.rotation.z = angle;

      group.add(lineMesh);
    }
  }
}

/**
 * 添加边缘线
 */
export function addEdgeMarkings(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  angle: number
): void {
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lineWidth = 0.4;

  const lineGeometry = new THREE.PlaneGeometry(lineWidth, start.distanceTo(end));
  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;

  // 左边缘
  const leftLine = new THREE.Mesh(lineGeometry, lineMaterial.clone());
  leftLine.position.set(midX, 0.16, midZ);
  leftLine.position.x += (width / 2) * Math.cos(angle);
  leftLine.position.z -= (width / 2) * Math.sin(angle);
  leftLine.rotation.x = -Math.PI / 2;
  leftLine.rotation.z = angle;
  group.add(leftLine);

  // 右边缘
  const rightLine = new THREE.Mesh(lineGeometry, lineMaterial.clone());
  rightLine.position.set(midX, 0.16, midZ);
  rightLine.position.x -= (width / 2) * Math.cos(angle);
  rightLine.position.z += (width / 2) * Math.sin(angle);
  rightLine.rotation.x = -Math.PI / 2;
  rightLine.rotation.z = angle;
  group.add(rightLine);
}
