import { createVector3 } from './three';

export const OrbitControls = vi.fn().mockImplementation(() => ({
  enableDamping: true,
  dampingFactor: 0.05,
  target: createVector3(0, 0, 0),
  update: vi.fn(),
  dispose: vi.fn(),
}));
