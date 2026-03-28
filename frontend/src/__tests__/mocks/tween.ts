export const TWEEN = {
  update: vi.fn(() => true),
  removeAll: vi.fn(),
};

export class Tween {
  static removeAll = vi.fn();
  static update = vi.fn(() => true);

  constructor(obj: any) {}
  to(end: any, duration: number) { return this; }
  easing(fn: any) { return this; }
  onUpdate(callback: any) { return this; }
  onComplete(callback: any) { return this; }
  chain(tween: any) { return this; }
  start() { return this; }
  stop() { return this; }
}
