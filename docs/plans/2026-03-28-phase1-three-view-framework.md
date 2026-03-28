# Phase 1: 三视图基础框架实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建三视图（宏观/微观/叙事）的基础框架，拆分 VirtualSpace3D 组件

**Architecture:**
- 将 VirtualSpace3D.tsx (3000+行) 拆分为模块化组件
- 创建 ViewportManager 管理三种视角的切换
- 每个视角有独立的相机配置和渲染参数
- 使用 Zustand 管理全局视图状态

**Tech Stack:** React, TypeScript, Three.js, Zustand, TWEEN.js

---

## Task 1: 创建视图状态管理 Store

**Files:**
- Create: `frontend/src/stores/viewState.ts`
- Create: `frontend/src/stores/index.ts`

**Step 1: 创建视图状态类型定义**

在 `frontend/src/stores/viewState.ts` 中创建：

```typescript
import { create } from 'zustand';
import { Camera, Vector3 } from 'three';

export type ViewMode = 'macro' | 'micro' | 'narrative';

export interface ViewState {
  currentMode: ViewMode;
  selectedAgentId: string | null;
  isTransitioning: boolean;

  // 相机配置
  cameraPosition: Vector3;
  cameraTarget: Vector3;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSelectedAgent: (agentId: string | null) => void;
  setTransitioning: (isTransitioning: boolean) => void;
  updateCamera: (position: Vector3, target: Vector3) => void;
  resetView: () => void;
}

const INITIAL_CAMERA_POS = new Vector3(100, 100, 100);
const INITIAL_CAMERA_TARGET = new Vector3(0, 0, 0);

export const useViewState = create<ViewState>((set) => ({
  currentMode: 'macro',
  selectedAgentId: null,
  isTransitioning: false,
  cameraPosition: INITIAL_CAMERA_POS.clone(),
  cameraTarget: INITIAL_CAMERA_TARGET.clone(),

  setViewMode: (mode) => set({ currentMode: mode }),
  setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),
  setTransitioning: (isTransitioning) => set({ isTransitioning }),
  updateCamera: (position, target) => set({
    cameraPosition: position.clone(),
    cameraTarget: target.clone(),
  }),
  resetView: () => set({
    currentMode: 'macro',
    selectedAgentId: null,
    cameraPosition: INITIAL_CAMERA_POS.clone(),
    cameraTarget: INITIAL_CAMERA_TARGET.clone(),
  }),
}));
```

**Step 2: 创建 store 导出文件**

在 `frontend/src/stores/index.ts` 中创建：

```typescript
export { useViewState } from './viewState';
export type { ViewMode } from './viewState';
```

**Step 3: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误输出

**Step 4: 提交**

```bash
git add frontend/src/stores/
git commit -m "feat: add view state management store with Zustand

- Create useViewState store for managing view modes and camera
- Support macro/micro/narrative view modes
- Add camera position and target tracking

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 创建相机过渡 Hook

**Files:**
- Create: `frontend/src/hooks/useCameraTransition.ts`

**Step 1: 安装 TWEEN.js 依赖**

```bash
cd frontend
npm install @tweenjs/tween.js @types/tweenjs
```

**Step 2: 创建相机过渡 Hook**

在 `frontend/src/hooks/useCameraTransition.ts` 中创建：

```typescript
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TWEEN } from '@tweenjs/tween.js';
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
```

**Step 3: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误输出

**Step 4: 提交**

```bash
git add frontend/src/hooks/useCameraTransition.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add camera transition hook with TWEEN

- Add useCameraTransition hook for smooth camera animations
- Support configurable duration and easing functions
- Add TWEEN.js dependency

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 创建场景层组件 (SceneLayer)

**Files:**
- Create: `frontend/src/components/VirtualSpace3D/layers/SceneLayer.tsx`

**Step 1: 创建场景层组件**

在 `frontend/src/components/VirtualSpace3D/layers/SceneLayer.tsx` 中创建：

```typescript
import { useRef, useEffect, ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface SceneLayerProps {
  children?: ReactNode;
  onSceneReady?: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => void;
}

export function SceneLayer({ children, onSceneReady }: SceneLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number>();

  // 初始化 Three.js 场景
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 天空蓝
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000
    );
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // 限制不能钻到地下
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controlsRef.current = controls;

    // 添加基础光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);

    // 通知父组件场景已就绪
    onSceneReady?.(scene, camera, renderer);

    // 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [onSceneReady]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误输出

**Step 3: 提交**

```bash
git add frontend/src/components/VirtualSpace3D/layers/SceneLayer.tsx
git commit -m "feat: add SceneLayer component for Three.js setup

- Initialize Three.js scene, camera, renderer
- Add OrbitControls with damping
- Setup basic lighting (ambient + directional with shadows)
- Handle window resize and cleanup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 创建视口管理器 (ViewportManager)

**Files:**
- Create: `frontend/src/components/VirtualSpace3D/ViewportManager.tsx`

**Step 1: 创建视口管理器组件**

在 `frontend/src/components/VirtualSpace3D/ViewportManager.tsx` 中创建：

```typescript
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneLayer } from './layers/SceneLayer';
import { useCameraTransition } from '../hooks/useCameraTransition';
import { useViewState, ViewMode } from '../stores/viewState';

export function ViewportManager() {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const { currentMode, setViewMode } = useViewState();

  const { transitionCamera, isTransitioning } = useCameraTransition(camera, controls);

  // 场景初始化回调
  const handleSceneReady = useCallback((
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    setScene(scene);
    setCamera(camera);
    setRenderer(renderer);
  }, []);

  // 根据视图模式设置相机位置
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

  // 切换视图模式
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (isTransitioning) return;
    setViewMode(mode);
    setupCameraForView(mode);
  }, [isTransitioning, setViewMode, setupCameraForView]);

  return (
    <div className="relative w-full h-full">
      <SceneLayer onSceneReady={handleSceneReady} />

      {/* 视图切换控制 */}
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
```

**Step 2: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误输出

**Step 3: 提交**

```bash
git add frontend/src/components/VirtualSpace3D/ViewportManager.tsx
git commit -m "feat: add ViewportManager for view mode switching

- Manage three view modes: macro, micro, narrative
- Add view switching buttons in top-right corner
- Integrate camera transition on mode change
- Disable buttons during transitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 创建主舞台组件 (WorldStage)

**Files:**
- Create: `frontend/src/components/VirtualSpace3D/WorldStage.tsx`

**Step 1: 创建主舞台组件**

在 `frontend/src/components/VirtualSpace3D/WorldStage.tsx` 中创建：

```typescript
import { ViewportManager } from './ViewportManager';

export function WorldStage() {
  return (
    <div className="w-full h-screen bg-gray-900">
      <ViewportManager />
    </div>
  );
}
```

**Step 2: 更新 App.tsx 使用新的 WorldStage**

修改 `frontend/src/App.tsx`：

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorldStage } from './components/VirtualSpace3D/WorldStage';
import { Dashboard } from './pages/Dashboard';
import { AgentDetail } from './pages/AgentDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/stage" element={<WorldStage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/agent/:agentId" element={<AgentDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

**Step 3: 验证 TypeScript 编译**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误输出

**Step 4: 提交**

```bash
git add frontend/src/components/VirtualSpace3D/WorldStage.tsx frontend/src/App.tsx
git commit -m "feat: add WorldStage component and update routing

- Create WorldStage as the main container for 3D visualization
- Add /stage route for accessing the new 3D view
- Keep existing Dashboard as default route

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 添加测试并验证

**Files:**
- Create: `frontend/src/components/VirtualSpace3D/__tests__/WorldStage.test.tsx`

**Step 1: 创建 WorldStage 测试**

在 `frontend/src/components/VirtualSpace3D/__tests__/WorldStage.test.tsx` 中创建：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldStage } from '../WorldStage';

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
  })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas'),
  })),
  Fog: vi.fn(),
  Color: vi.fn(),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(),
  PCFSoftShadowMap: 0,
}));

// Mock OrbitControls
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
}));

describe('WorldStage', () => {
  it('应该渲染主容器', () => {
    render(<WorldStage />);
    const container = screen.getByText(/宏观/);
    expect(container).toBeInTheDocument();
  });

  it('应该显示三个视图切换按钮', () => {
    render(<WorldStage />);
    expect(screen.getByText('宏观')).toBeInTheDocument();
    expect(screen.getByText('微观')).toBeInTheDocument();
    expect(screen.getByText('叙事')).toBeInTheDocument();
  });
});
```

**Step 2: 运行测试**

Run: `cd frontend && npm test -- --run`
Expected: 所有测试通过

**Step 3: 手动测试**

```bash
# 启动前端开发服务器
cd frontend
npm run dev

# 在浏览器访问
# http://localhost:5173/stage
```

验证：
- [ ] 页面正常加载
- [ ] 可以看到三个视图切换按钮
- [ ] 点击按钮可以切换视图
- [ ] 相机在切换时有平滑过渡动画
- [ ] 可以用鼠标拖拽旋转视角

**Step 4: 提交**

```bash
git add frontend/src/components/VirtualSpace3D/__tests__/WorldStage.test.tsx
git commit -m "test: add WorldStage component tests

- Add basic tests for WorldStage component
- Mock Three.js and OrbitControls
- Test view switching buttons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 更新文档

**Files:**
- Modify: `frontend/src/components/VirtualSpace3D/README.md`

**Step 1: 创建组件文档**

在 `frontend/src/components/VirtualSpace3D/README.md` 中创建：

```markdown
# VirtualSpace3D 组件架构

## 概述

VirtualSpace3D 是 3D 虚拟世界可视化的核心组件模块，采用模块化架构设计。

## 组件结构

```
VirtualSpace3D/
├── WorldStage.tsx              # 主舞台容器
├── ViewportManager.tsx         # 视口管理器
├── layers/
│   └── SceneLayer.tsx          # Three.js 场景层
└── __tests__/
    └── WorldStage.test.tsx     # 组件测试
```

## 使用方式

### 基础使用

```typescript
import { WorldStage } from './components/VirtualSpace3D/WorldStage';

function App() {
  return <WorldStage />;
}
```

### 访问 3D 舞台

在浏览器中访问 `/stage` 路由即可查看 3D 虚拟世界。

## 视图模式

- **宏观 (Macro)**: 高空俯视，查看整个城市布局
- **微观 (Micro)**: 街景跟随，聚焦单个 Agent
- **叙事 (Narrative)**: 电影模式，讲述 Agent 故事

## 状态管理

使用 Zustand store (`useViewState`) 管理全局视图状态：

```typescript
import { useViewState } from '../stores/viewState';

function MyComponent() {
  const { currentMode, setViewMode } = useViewState();
  // ...
}
```

## 相机控制

使用 `useCameraTransition` hook 实现平滑相机动画：

```typescript
import { useCameraTransition } from '../hooks/useCameraTransition';

function MyComponent() {
  const { transitionCamera } = useCameraTransition(camera, controls);

  const handleClick = () => {
    transitionCamera(
      new THREE.Vector3(100, 100, 100),
      new THREE.Vector3(0, 0, 0),
      { duration: 1500 }
    );
  };
}
```
```

**Step 2: 提交**

```bash
git add frontend/src/components/VirtualSpace3D/README.md
git commit -m "docs: add VirtualSpace3D component documentation

- Document component structure and usage
- Add examples for view modes and state management
- Include camera control examples

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 1 完成检查清单

- [x] 创建视图状态管理 Store (Zustand)
- [x] 创建相机过渡 Hook (TWEEN.js)
- [x] 创建场景层组件 (SceneLayer)
- [x] 创建视口管理器 (ViewportManager)
- [x] 创建主舞台组件 (WorldStage)
- [x] 添加测试并验证
- [x] 更新文档

## 下一步

Phase 1 完成后，继续 **Phase 2: 宏观视角 + 城市渲染优化**
