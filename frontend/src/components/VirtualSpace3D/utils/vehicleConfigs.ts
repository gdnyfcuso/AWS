/**
 * 车辆配置数据
 */

import * as THREE from 'three';
import { VehicleTypeConfig } from '../types';

/**
 * 车辆类型配置
 */
export const VEHICLE_TYPE_CONFIGS: Record<string, VehicleTypeConfig> = {
  car: {
    bodyShape: 'sedan',
    size: { length: 8, width: 4, height: 3 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-3, -1, 2),
      new THREE.Vector3(3, -1, 2),
      new THREE.Vector3(-3, -1, -2),
      new THREE.Vector3(3, -1, -2),
    ],
  },
  bus: {
    bodyShape: 'box',
    size: { length: 16, width: 5, height: 5 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-5, -1, 2),
      new THREE.Vector3(5, -1, 2),
      new THREE.Vector3(-5, -1, -2),
      new THREE.Vector3(5, -1, -2),
    ],
  },
  truck: {
    bodyShape: 'box',
    size: { length: 14, width: 5, height: 6 },
    hasRoof: true,
    windowConfig: { front: true, rear: false, sides: true },
    wheelPositions: [
      new THREE.Vector3(-4, -1, 2),
      new THREE.Vector3(4, -1, 2),
      new THREE.Vector3(-4, -1, -2),
      new THREE.Vector3(4, -1, -2),
    ],
  },
  motorcycle: {
    bodyShape: 'rounded',
    size: { length: 4, width: 1.5, height: 2 },
    hasRoof: false,
    windowConfig: { front: false, rear: false, sides: false },
    wheelPositions: [
      new THREE.Vector3(-1.5, -0.5, 0),
      new THREE.Vector3(1.5, -0.5, 0),
    ],
  },
  bicycle: {
    bodyShape: 'rounded',
    size: { length: 3, width: 1, height: 2 },
    hasRoof: false,
    windowConfig: { front: false, rear: false, sides: false },
    wheelPositions: [
      new THREE.Vector3(-1, -0.5, 0),
      new THREE.Vector3(1, -0.5, 0),
    ],
  },
  taxi: {
    bodyShape: 'sedan',
    size: { length: 8, width: 4, height: 3 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-3, -1, 2),
      new THREE.Vector3(3, -1, 2),
      new THREE.Vector3(-3, -1, -2),
      new THREE.Vector3(3, -1, -2),
    ],
  },
  emergency: {
    bodyShape: 'sedan',
    size: { length: 9, width: 4.5, height: 3.5 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-3.5, -1, 2.25),
      new THREE.Vector3(3.5, -1, 2.25),
      new THREE.Vector3(-3.5, -1, -2.25),
      new THREE.Vector3(3.5, -1, -2.25),
    ],
  },
  electric_car: {
    bodyShape: 'rounded',
    size: { length: 8, width: 4, height: 2.8 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-3, -1, 2),
      new THREE.Vector3(3, -1, 2),
      new THREE.Vector3(-3, -1, -2),
      new THREE.Vector3(3, -1, -2),
    ],
  },
  delivery: {
    bodyShape: 'box',
    size: { length: 12, width: 5, height: 4.5 },
    hasRoof: true,
    windowConfig: { front: true, rear: false, sides: true },
    wheelPositions: [
      new THREE.Vector3(-4, -1, 2),
      new THREE.Vector3(4, -1, 2),
      new THREE.Vector3(-4, -1, -2),
      new THREE.Vector3(4, -1, -2),
    ],
  },
};

/**
 * 情绪颜色映射
 */
export const MOOD_COLORS: Record<string, string> = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};
