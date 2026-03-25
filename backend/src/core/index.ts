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

// 城市级地形系统
export { CityTerrainSystem, cityTerrainSystem } from './CityTerrainSystem';
export type { TerrainData, ElevationPoint } from './CityTerrainSystem';

// 国家地图系统
export { CountryMapSystem, countryMapSystem, CHINA_REGIONS } from './CountryMapSystem';
export type { RegionConfig, RegionType } from './CountryMapSystem';
