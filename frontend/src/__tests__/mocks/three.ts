const createVector3 = (x: number, y: number, z: number) => ({
  x,
  y,
  z,
  set: vi.fn(function(this: any, nx: number, ny: number, nz: number) {
    this.x = nx;
    this.y = ny;
    this.z = nz;
    return this;
  }),
  clone: vi.fn(function(this: any) {
    return createVector3(this.x, this.y, this.z);
  }),
});

export const Scene = vi.fn().mockImplementation(() => ({
  add: vi.fn(),
  remove: vi.fn(),
}));

export const PerspectiveCamera = vi.fn().mockImplementation(() => ({
  position: createVector3(0, 0, 0),
  updateProjectionMatrix: vi.fn(),
}));

export const WebGLRenderer = vi.fn().mockImplementation(() => ({
  setSize: vi.fn(),
  render: vi.fn(),
  domElement: document.createElement('canvas'),
}));

export const Fog = vi.fn();
export const Color = vi.fn();
export const AmbientLight = vi.fn();
export const DirectionalLight = vi.fn();
export const PCFSoftShadowMap = 0;
export const Vector3 = vi.fn((x: number, y: number, z: number) => createVector3(x, y, z));
