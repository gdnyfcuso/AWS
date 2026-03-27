/**
 * 相机控制 Hook
 * 管理相机视角模式和控制器
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// @ts-ignore - OrbitControls import
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ViewMode, Agent3D } from '../types';

export interface UseCameraControlsOptions {
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  rendererRef: React.RefObject<THREE.WebGLRenderer>;
  viewMode?: ViewMode;
  trackedAgentId?: string | null;
  agents?: Agent3D[];
}

export interface UseCameraControlsReturn {
  controlsRef: React.RefObject<OrbitControls>;
  updateCameraForViewMode: () => void;
}

export function useCameraControls(options: UseCameraControlsOptions): UseCameraControlsReturn {
  const {
    cameraRef,
    rendererRef,
    viewMode = 'third-person',
    trackedAgentId,
    agents = [],
  } = options;

  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!cameraRef.current || !rendererRef.current) return;

    const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2;

    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [cameraRef, rendererRef]);

  // 根据视角模式更新相机
  const updateCameraForViewMode = () => {
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (viewMode) {
      case 'first-person':
        // 第一人称：相机在 Agent 位置
        controls.enabled = false;
        break;

      case 'second-person':
        // 第二人称：相机在 Agent 后方
        controls.enabled = false;
        break;

      case 'third-person':
      default:
        // 第三人称：自由视角
        controls.enabled = true;
        controls.target.set(0, 0, 0);
        camera.position.set(0, 50, 100);
        break;
    }
  };

  // 当追踪 Agent 时更新相机位置
  useEffect(() => {
    if (!trackedAgentId || !cameraRef.current) return;

    const agent = agents.find(a => a.agent_id === trackedAgentId);
    if (!agent) return;

    const camera = cameraRef.current;

    switch (viewMode) {
      case 'first-person':
        camera.position.set(agent.x, agent.y + 2, agent.z);
        break;

      case 'second-person':
        camera.position.set(agent.x, agent.y + 10, agent.z + 20);
        if (controlsRef.current) {
          controlsRef.current.target.set(agent.x, agent.y, agent.z);
        }
        break;

      case 'third-person':
        // 第三人称不需要特别处理
        break;
    }
  }, [trackedAgentId, agents, viewMode, cameraRef]);

  // 当视角模式变化时更新相机
  useEffect(() => {
    updateCameraForViewMode();
  }, [viewMode]);

  return {
    controlsRef,
    updateCameraForViewMode,
  };
}
