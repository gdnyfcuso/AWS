/**
 * Agent 物理模拟 Hook
 * 管理 Agent 的移动、跳跃等物理状态
 */

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { AgentPhysics } from '../types';

export interface UseAgentPhysicsReturn {
  agentPhysicsRef: React.RefObject<Map<string, AgentPhysics>>;
  updateAgentPhysics: (
    agentId: string,
    deltaTime: number,
    keysPressed: Set<string>,
    position: { x: number; y: number; z: number }
  ) => { x: number; y: number; z: number };
  setAgentGround: (agentId: string, groundY: number) => void;
}

const GRAVITY = -30;
const JUMP_FORCE = 10;
const MOVE_SPEED = 8;
const ROTATION_SPEED = 3;

export function useAgentPhysics(): UseAgentPhysicsReturn {
  const agentPhysicsRef = useRef<Map<string, AgentPhysics>>(new Map());

  // 设置 Agent 地面高度
  const setAgentGround = useCallback((agentId: string, groundY: number) => {
    const physics = agentPhysicsRef.current.get(agentId);
    if (physics) {
      physics.groundY = groundY;
    } else {
      agentPhysicsRef.current.set(agentId, {
        velocityY: 0,
        isJumping: false,
        groundY,
      });
    }
  }, []);

  // 更新 Agent 物理状态
  const updateAgentPhysics = useCallback((
    agentId: string,
    deltaTime: number,
    keysPressed: Set<string>,
    position: { x: number; y: number; z: number }
  ) => {
    // 初始化物理状态
    if (!agentPhysicsRef.current.has(agentId)) {
      agentPhysicsRef.current.set(agentId, {
        velocityY: 0,
        isJumping: false,
        groundY: 0,
      });
    }

    const physics = agentPhysicsRef.current.get(agentId)!;
    let newPosition = { ...position };

    // 跳跃处理
    if (keysPressed.has(' ') || keysPressed.has('Space')) {
      if (!physics.isJumping) {
        physics.velocityY = JUMP_FORCE;
        physics.isJumping = true;
      }
    }

    // 应用重力
    if (physics.isJumping) {
      physics.velocityY += GRAVITY * deltaTime;
      newPosition.y += physics.velocityY * deltaTime;

      // 落地检测
      if (newPosition.y <= physics.groundY) {
        newPosition.y = physics.groundY;
        physics.velocityY = 0;
        physics.isJumping = false;
      }
    } else {
      newPosition.y = physics.groundY;
    }

    // 移动处理 (WASD)
    let dx = 0;
    let dz = 0;

    if (keysPressed.has('w') || keysPressed.has('W')) {
      dz -= 1;
    }
    if (keysPressed.has('s') || keysPressed.has('S')) {
      dz += 1;
    }
    if (keysPressed.has('a') || keysPressed.has('A')) {
      dx -= 1;
    }
    if (keysPressed.has('d') || keysPressed.has('D')) {
      dx += 1;
    }

    if (dx !== 0 || dz !== 0) {
      const length = Math.sqrt(dx * dx + dz * dz);
      dx /= length;
      dz /= length;

      newPosition.x += dx * MOVE_SPEED * deltaTime;
      newPosition.z += dz * MOVE_SPEED * deltaTime;
    }

    return newPosition;
  }, []);

  return {
    agentPhysicsRef,
    updateAgentPhysics,
    setAgentGround,
  };
}
