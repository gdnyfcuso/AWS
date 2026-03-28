import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

export interface DialogueData {
  id: string;
  agentId: string;
  message: string;
  mood: 'happy' | 'neutral' | 'sad' | 'angry' | 'trade' | 'conflict';
  timestamp: number;
}

export interface DialogueRendererProps {
  dialogues: DialogueData[];
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
}

// 情绪对应的气泡颜色
const DIALOGUE_COLORS = {
  happy: 'bg-orange-400',
  neutral: 'bg-gray-500',
  sad: 'bg-blue-400',
  angry: 'bg-red-400',
  trade: 'bg-yellow-400',
  conflict: 'bg-red-500',
};

export function DialogueRenderer({
  dialogues,
  scene,
  camera,
  renderer,
}: DialogueRendererProps) {
  const cssRendererRef = useRef<CSS3DRenderer | null>(null);
  const cssObjectsRef = useRef<Map<string, CSS3DObject>>(new Map());

  useEffect(() => {
    if (!scene || !camera || !renderer) return;

    // 创建 CSS3D 渲染器
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(
      renderer.domElement.clientWidth,
      renderer.domElement.clientHeight
    );
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.parentElement?.appendChild(cssRenderer.domElement);

    cssRendererRef.current = cssRenderer;

    // 渲染循环
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      cssRenderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      cssRenderer.dispose();
      if (cssRenderer.domElement.parentElement) {
        cssRenderer.domElement.parentElement.removeChild(cssRenderer.domElement);
      }
    };
  }, [scene, camera, renderer]);

  // 更新对话气泡
  useEffect(() => {
    if (!scene || !cssRendererRef.current) return;

    const now = Date.now();
    const activeDialogues = dialogues.filter(d => now - d.timestamp < 8000); // 8秒后消失

    // 移除过期的对话
    const previousObjects = cssObjectsRef.current;
    previousObjects.forEach((obj, id) => {
      if (!activeDialogues.find(d => d.id === id)) {
        scene.remove(obj);
        obj.element.remove();
      }
    });

    // 添加新的对话
    const newObjects = new Map<string, CSS3DObject>();
    activeDialogues.forEach(dialogue => {
      const existing = previousObjects.get(dialogue.id);
      if (existing) {
        newObjects.set(dialogue.id, existing);
        return;
      }

      // 创建对话气泡
      const div = document.createElement('div');
      div.className = `px-3 py-2 rounded-lg shadow-lg text-white text-sm max-w-xs ${DIALOGUE_COLORS[dialogue.mood]}`;
      div.textContent = dialogue.message;
      div.style.transition = 'opacity 0.3s';

      const object = new CSS3DObject(div);
      object.position.set(
        dialogue.agentId === 'agent1' ? 0 : 5,
        3,
        dialogue.agentId === 'agent1' ? 0 : 5
      );
      scene.add(object);
      newObjects.set(dialogue.id, object);
    });

    cssObjectsRef.current = newObjects;
  }, [dialogues, scene]);

  return null;
}
