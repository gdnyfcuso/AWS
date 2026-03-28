import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneLayer } from './layers/SceneLayer';
import { PostProcessingLayer } from './layers/PostProcessingLayer';
import { CinematicPostProcessing } from './layers/CinematicPostProcessing';
import { MacroView } from './views/MacroView';
import { MicroView } from './views/MicroView';
import { NarrativeView } from './views/NarrativeView';
import { EnvironmentRenderer } from './renderers/EnvironmentRenderer';
import { useCameraTransition } from '../../hooks/useCameraTransition';
import { useViewState, ViewMode } from '../../stores/viewState';

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours % 1) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function ViewportManager() {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [virtualTime, setVirtualTime] = useState(12); // 12:00 PM
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

  // 渲染循环
  useEffect(() => {
    if (!scene || !camera || !renderer || !controls) return;

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // 根据模式选择渲染方式
      const cinematicComposer = (renderer as any).cinematicComposer;
      const macroComposer = (renderer as any).composer;

      if (currentMode === 'narrative' && cinematicComposer) {
        cinematicComposer.render();
      } else if (currentMode === 'macro' && macroComposer) {
        macroComposer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [scene, camera, renderer, controls, currentMode]);

  return (
    <div className="relative w-full h-full">
      <SceneLayer onSceneReady={handleSceneReady} />

      {scene && camera && renderer && (
        <>
          <EnvironmentRenderer
            scene={scene}
            virtualTime={virtualTime}
          />

          <PostProcessingLayer
            scene={scene}
            camera={camera}
            renderer={renderer}
            enabled={currentMode === 'macro'}
            bloomStrength={0.3}
            bloomRadius={0.5}
            bloomThreshold={0.7}
          />

          <CinematicPostProcessing
            scene={scene}
            camera={camera}
            renderer={renderer}
            enabled={currentMode === 'narrative'}
            focusDistance={10}
            bokehAperture={0.0001}
          />

          {currentMode === 'macro' && (
            <MacroView scene={scene} camera={camera} />
          )}

          {currentMode === 'micro' && (
            <MicroView
              scene={scene}
              camera={camera}
              renderer={renderer}
              selectedAgentId={selectedAgentId}
              onAgentClick={setSelectedAgentId}
            />
          )}

          {currentMode === 'narrative' && (
            <NarrativeView scene={scene} camera={camera} />
          )}
        </>
      )}

      {/* 时间控制 */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded z-10">
        <div className="text-sm">虚拟时间</div>
        <div className="text-lg font-mono">{formatTime(virtualTime)}</div>
        <input
          type="range"
          min="0"
          max="24"
          step="0.1"
          value={virtualTime}
          onChange={(e) => setVirtualTime(parseFloat(e.target.value))}
          className="w-32 mt-2"
        />
      </div>

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
