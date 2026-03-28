import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface EnvironmentRendererProps {
  scene: THREE.Scene | null;
  virtualTime: number; // 0-24 小时制
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}

/**
 * 环境渲染器 - 动态光照和天气系统
 */
export function EnvironmentRenderer({
  scene,
  virtualTime,
  season = 'spring'
}: EnvironmentRendererProps) {
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  useEffect(() => {
    if (!scene) return;

    // 创建太阳光
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    return () => {
      scene.remove(sunLight);
      scene.remove(ambientLight);
    };
  }, [scene]);

  // 根据虚拟时间更新光照
  useEffect(() => {
    if (!sunLightRef.current || !ambientLightRef.current) return;

    // 计算太阳位置（简单模型）
    // 6:00 日出，18:00 日落
    const sunAngle = ((virtualTime - 6) / 12) * Math.PI; // -PI/2 到 PI/2

    const sunHeight = Math.sin(sunAngle) * 200;
    const sunDistance = Math.cos(sunAngle) * 200;

    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunDistance, Math.max(sunHeight, 10), 0);
      sunLightRef.current.target.set(0, 0, 0);

      // 根据时间调整光照强度和颜色
      if (virtualTime >= 6 && virtualTime < 8) {
        // 日出 - 暖色
        sunLightRef.current.intensity = 0.5;
        sunLightRef.current.color.setHex(0xffaa77);
        ambientLightRef.current!.intensity = 0.3;
      } else if (virtualTime >= 8 && virtualTime < 17) {
        // 白天 - 亮白色
        sunLightRef.current.intensity = 1;
        sunLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current!.intensity = 0.4;
      } else if (virtualTime >= 17 && virtualTime < 19) {
        // 日落 - 暖橙色
        sunLightRef.current.intensity = 0.6;
        sunLightRef.current.color.setHex(0xff6633);
        ambientLightRef.current!.intensity = 0.25;
      } else {
        // 夜晚 - 暗蓝色
        sunLightRef.current.intensity = 0.1;
        sunLightRef.current.color.setHex(0x334455);
        ambientLightRef.current!.intensity = 0.1;
      }
    }
  }, [virtualTime]);

  // 根据季节调整场景
  useEffect(() => {
    if (!scene) return;

    // 移除旧的季节效果
    const oldSeasonal = scene.getObjectByName('seasonal');
    if (oldSeasonal) {
      scene.remove(oldSeasonal);
    }

    // 添加新的季节效果
    const seasonalGroup = new THREE.Group();
    seasonalGroup.name = 'seasonal';

    if (season === 'winter') {
      // 冬季 - 雪地效果
      const snowGeometry = new THREE.PlaneGeometry(500, 500);
      const snowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
      });
      const snow = new THREE.Mesh(snowGeometry, snowMaterial);
      snow.rotation.x = -Math.PI / 2;
      snow.position.y = 0.05;
      seasonalGroup.add(snow);
    } else if (season === 'summer') {
      // 夏季 - 更绿的草地
      const grassGeometry = new THREE.PlaneGeometry(500, 500);
      const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x228822,
        roughness: 0.9,
      });
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.rotation.x = -Math.PI / 2;
      grass.position.y = 0.02;
      seasonalGroup.add(grass);
    }

    scene.add(seasonalGroup);

    return () => {
      scene.remove(seasonalGroup);
    };
  }, [scene, season]);

  return null;
}
