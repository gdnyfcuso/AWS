import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export interface PostProcessingLayerProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  enabled?: boolean;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
}

export function PostProcessingLayer({
  scene,
  camera,
  renderer,
  enabled = true,
  bloomStrength = 0.5,
  bloomRadius = 0.4,
  bloomThreshold = 0.8,
}: PostProcessingLayerProps) {
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    if (!scene || !camera || !renderer || !enabled) return;

    // 创建后处理 composer
    const composer = new EffectComposer(renderer);

    // 添加渲染通道
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 添加 Bloom 效果
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);

    composerRef.current = composer;

    return () => {
      composer.dispose();
    };
  }, [scene, camera, renderer, enabled, bloomStrength, bloomRadius, bloomThreshold]);

  // 在渲染循环中使用 composer 替代 renderer.render
  useEffect(() => {
    if (!composerRef.current) return;

    // 将 composer 挂载到 renderer 上供外部使用
    (renderer as any).composer = composerRef.current;
  }, [renderer]);

  return null;
}
