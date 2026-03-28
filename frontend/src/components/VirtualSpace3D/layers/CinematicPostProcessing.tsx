import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

export interface CinematicPostProcessingProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  enabled?: boolean;
  focusDistance?: number;
  bokehAperture?: number;
}

export function CinematicPostProcessing({
  scene,
  camera,
  renderer,
  enabled = true,
  focusDistance = 10,
  bokehAperture = 0.0001,
}: CinematicPostProcessingProps) {
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    if (!scene || !camera || !renderer || !enabled) return;

    const composer = new EffectComposer(renderer);

    // 渲染通道
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom 效果
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2,  // strength
      0.5,  // radius
      0.85  // threshold
    );
    composer.addPass(bloomPass);

    // 胶片颗粒效果
    const filmPass = new FilmPass(
      0.35,  // noise intensity
      0.025, // scanline intensity
      648,   // scanline count
      false  // grayscale
    );
    composer.addPass(filmPass);

    // 景深效果 (Bokeh)
    const bokehPass = new BokehPass(
      scene,
      camera,
      {
        focus: focusDistance,
        aperture: bokehAperture,
        maxblur: 0.01,
      }
    );
    composer.addPass(bokehPass);

    composerRef.current = composer;

    // 将 composer 挂载到 renderer 上
    (renderer as any).cinematicComposer = composerRef.current;

    return () => {
      composer.dispose();
    };
  }, [scene, camera, renderer, enabled, focusDistance, bokehAperture]);

  return null;
}
