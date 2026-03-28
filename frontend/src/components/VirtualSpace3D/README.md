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
    └── mocks/                  # Three.js 测试 mock
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
