/**
 * Three.js 场景管理 Hook
 * 负责场景的初始化、渲染器和相机的设置
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface UseThreeSceneOptions {
  enableShadows?: boolean;
  backgroundColor?: number;
  fogColor?: number;
  fogNear?: number;
  fogFar?: number;
}

export interface UseThreeSceneReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  sceneRef: React.RefObject<THREE.Scene>;
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  rendererRef: React.RefObject<THREE.WebGLRenderer>;
  isReady: boolean;
  error: boolean;
}

export function useThreeScene(options: UseThreeSceneOptions = {}): UseThreeSceneReturn {
  const {
    enableShadows = true,
    backgroundColor = 0x87CEEB,
    fogColor = 0x87CEEB,
    fogNear = 100,
    fogFar = 1000,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // 检查 WebGL 支持
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setError(true);
        return;
      }

      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
      sceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        2000
      );
      camera.position.set(0, 50, 100);
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = enableShadows;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // 添加到 DOM
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);

      // 添加环境光
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // 添加方向光（太阳）
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 200, 100);
      directionalLight.castShadow = enableShadows;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -200;
      directionalLight.shadow.camera.right = 200;
      directionalLight.shadow.camera.top = 200;
      directionalLight.shadow.camera.bottom = -200;
      scene.add(directionalLight);

      setIsReady(true);

      // 清理函数
      return () => {
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        scene.clear();
      };
    } catch (err) {
      console.error('[useThreeScene] Failed to initialize:', err);
      setError(true);
    }
  }, [backgroundColor, enableShadows, fogColor, fogFar, fogNear]);

  // 处理窗口大小变化
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    containerRef,
    sceneRef,
    cameraRef,
    rendererRef,
    isReady,
    error,
  };
}
