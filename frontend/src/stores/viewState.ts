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
