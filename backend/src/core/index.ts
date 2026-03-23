// 核心模块统一导出

export { WorldEngine } from './WorldEngine';
export { TimeSystem, type TimeConfig, type WorldTime } from './TimeSystem';
export { LocationSystem, type LocationConfig } from './LocationSystem';
export { AgentManager } from './AgentManager';
export { EventManager, eventManager, type EventData } from './EventManager';
export { getBehaviorLoop, type BehaviorLoopConfig } from './AgentBehaviorLoop';
export { getSimulator } from './AgentSimulator';

// 3D虚拟空间扩展
export { MapCoordinateSystem, mapCoordinateSystem, ZOOM_LEVELS, BEIJING_LANDMARKS, BEIJING_DISTRICTS } from './MapCoordinateSystem';
export { TerrainSystem } from './TerrainSystem';
export { RoadNetwork } from './RoadNetwork';
export { VehicleSystem } from './VehicleSystem';
