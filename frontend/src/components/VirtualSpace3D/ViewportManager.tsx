import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneLayer } from './layers/SceneLayer';
import { useCameraTransition } from '../../hooks/useCameraTransition';
import { useViewState, ViewMode } from '../../stores/viewState';

export function ViewportManager() {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const { currentMode, setViewMode } = useViewState();

  const { transitionCamera, isTransitioning } = useCameraTransition(camera, controls);

  const handleSceneReady = useCallback((
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    setScene(scene);
    setCamera(camera);
    setRenderer(renderer);

    // 获取 OrbitControls
    const container = renderer.domElement.parentElement;
    if (container) {
      const controls = new OrbitControls(camera as THREE.PerspectiveCamera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.minDistance = 10;
      controls.maxDistance = 500;
      setControls(controls);
    }
  }, []);

  const setupCameraForView = useCallback((mode: ViewMode) => {
    if (!camera) return;

    const configs = {
      macro: {
        position: new THREE.Vector3(200, 200, 200),
        target: new THREE.Vector3(0, 0, 0),
      },
      micro: {
        position: new THREE.Vector3(20, 15, 20),
        target: new THREE.Vector3(0, 0, 0),
      },
      narrative: {
        position: new THREE.Vector3(50, 20, 50),
        target: new THREE.Vector3(0, 0, 0),
      },
    };

    const config = configs[mode];
    transitionCamera(config.position, config.target, {
      duration: 1500,
    });
  }, [camera, transitionCamera]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (isTransitioning) return;
    setViewMode(mode);
    setupCameraForView(mode);
  }, [isTransitioning, setViewMode, setupCameraForView]);

  return (
    <div className="relative w-full h-full">
      <SceneLayer onSceneReady={handleSceneReady} />

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => handleViewModeChange('macro')}
          className={`px-4 py-2 rounded ${
            currentMode === 'macro'
              ? 'bg-blue-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-white'
          }`}
          disabled={isTransitioning}
        >
          宏观
        </button>
        <button
          onClick={() => handleViewModeChange('micro')}
          className={`px-4 py-2 rounded ${
            currentMode === 'micro'
              ? 'bg-blue-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-white'
          }`}
          disabled={isTransitioning}
        >
          微观
        </button>
        <button
          onClick={() => handleViewModeChange('narrative')}
          className={`px-4 py-2 rounded ${
            currentMode === 'narrative'
              ? 'bg-blue-500 text-white'
              : 'bg-white/80 text-gray-700 hover:bg-white'
          }`}
          disabled={isTransitioning}
        >
          叙事
        </button>
      </div>
    </div>
  );
}
