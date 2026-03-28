import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { useViewState } from '../stores/viewState';

export interface CameraTransitionOptions {
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
}

export function useCameraTransition(
  camera: THREE.Camera | null,
  controls: any
) {
  const { isTransitioning, setTransitioning, updateCamera } = useViewState();
  const tweenRef = useRef<TWEEN.Tween | null>(null);

  // 清理现有动画
  const cleanupTween = () => {
    if (tweenRef.current) {
      tweenRef.current.stop();
      tweenRef.current = null;
    }
  };

  // 相机过渡动画
  const transitionCamera = (
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    options: CameraTransitionOptions = {}
  ) => {
    if (!camera) return;

    const {
      duration = 1500,
      easing = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, // easeInOutCubic
      onComplete,
    } = options;

    cleanupTween();
    setTransitioning(true);

    const startPosition = camera.position.clone();
    const startTarget = controls?.target?.clone() || new THREE.Vector3();

    // 创建位置补间
    const positionTween = new TWEEN.Tween({
      x: startPosition.x,
      y: startPosition.y,
      z: startPosition.z,
    })
      .to(
        {
          x: targetPosition.x,
          y: targetPosition.y,
          z: targetPosition.z,
        },
        duration
      )
      .easing(easing)
      .onUpdate((obj) => {
        if (camera) {
          camera.position.set(obj.x, obj.y, obj.z);
        }
      });

    // 创建目标点补间
    const targetTween = new TWEEN.Tween({
      x: startTarget.x,
      y: startTarget.y,
      z: startTarget.z,
    })
      .to(
        {
          x: targetLookAt.x,
          y: targetLookAt.y,
          z: targetLookAt.z,
        },
        duration
      )
      .easing(easing)
      .onUpdate((obj) => {
        if (controls) {
          controls.target.set(obj.x, obj.y, obj.z);
          controls.update();
        }
      })
      .onComplete(() => {
        setTransitioning(false);
        updateCamera(targetPosition.clone(), targetLookAt.clone());
        onComplete?.();
      });

    // 链式动画
    positionTween.chain(targetTween);
    positionTween.start();

    tweenRef.current = targetTween;
  };

  // TWEEN 更新循环
  useEffect(() => {
    const animate = () => {
      TWEEN.update();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cleanupTween();
      TWEEN.removeAll();
    };
  }, []);

  return {
    transitionCamera,
    isTransitioning,
  };
}
