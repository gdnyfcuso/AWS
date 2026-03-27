/**
 * 车辆渲染器
 * 负责创建和管理 3D 车辆对象
 */

import * as THREE from 'three';
import { VehicleData } from '../../VehicleRenderer';
import { geometryGenerator } from '../../../utils/threejs/GeometryGenerator';
import { VEHICLE_TYPE_CONFIGS } from '../utils/vehicleConfigs';

/**
 * 创建车辆网格
 */
export function createVehicleMesh(vehicle: VehicleData): THREE.Group | null {
  const typeConfig = VEHICLE_TYPE_CONFIGS[vehicle.type];
  if (!typeConfig) {
    console.warn(`[VehicleRenderer] Unknown vehicle type: ${vehicle.type}`);
    return null;
  }

  const vehicleGroup = geometryGenerator.createVehicle({
    type: vehicle.type,
    bodyShape: typeConfig.bodyShape,
    size: typeConfig.size,
    hasRoof: typeConfig.hasRoof,
    windowConfig: typeConfig.windowConfig,
    wheelPositions: typeConfig.wheelPositions,
    color: vehicle.color,
  });

  vehicleGroup.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
  vehicleGroup.rotation.y = vehicle.rotation;

  vehicleGroup.name = vehicle.name || `Vehicle_${vehicle.vehicle_id}`;
  vehicleGroup.castShadow = true;
  vehicleGroup.receiveShadow = true;

  vehicleGroup.userData = { vehicle };

  return vehicleGroup;
}

/**
 * 更新车辆位置
 */
export function updateVehiclePosition(
  vehicleMesh: THREE.Group,
  position: { x: number; y: number; z: number },
  rotation: number
): void {
  vehicleMesh.position.set(position.x, position.y, position.z);
  vehicleMesh.rotation.y = rotation;
}

/**
 * 创建车辆点击检测
 */
export function setupVehicleClickHandler(
  vehicleMesh: THREE.Group,
  onClick: (vehicle: VehicleData) => void
): void {
  vehicleMesh.userData.isVehicle = true;
  // 点击处理在主组件的 raycaster 中统一处理
}
