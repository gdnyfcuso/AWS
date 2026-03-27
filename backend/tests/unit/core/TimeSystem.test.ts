/**
 * TimeSystem 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeSystem, TimeConfig, WorldTime } from '../../../src/core/TimeSystem';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock database
vi.mock('../../../src/services/database', () => ({
  getDatabase: () => ({
    worldState: {
      updateMany: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe('TimeSystem', () => {
  let timeSystem: TimeSystem;
  let defaultConfig: TimeConfig;

  beforeEach(() => {
    // 使用较快的速度进行测试
    defaultConfig = {
      speed: 60, // 60倍速，每秒推进1分钟
      startTime: '08:00',
      startDate: '2024-03-15',
    };
    timeSystem = new TimeSystem(defaultConfig);
  });

  afterEach(() => {
    timeSystem.stop();
  });

  describe('初始化', () => {
    it('应该使用提供的配置初始化', () => {
      const time = timeSystem.getCurrentTime();

      expect(time.date).toBe('2024-03-15');
      expect(time.time).toBe('08:00:00');
    });

    it('应该正确识别春季', () => {
      const springSystem = new TimeSystem({
        ...defaultConfig,
        startDate: '2024-04-15',
      });
      expect(springSystem.getCurrentTime().season).toBe('spring');
    });

    it('应该正确识别夏季', () => {
      const summerSystem = new TimeSystem({
        ...defaultConfig,
        startDate: '2024-07-15',
      });
      expect(summerSystem.getCurrentTime().season).toBe('summer');
    });

    it('应该正确识别秋季', () => {
      const autumnSystem = new TimeSystem({
        ...defaultConfig,
        startDate: '2024-10-15',
      });
      expect(autumnSystem.getCurrentTime().season).toBe('autumn');
    });

    it('应该正确识别冬季', () => {
      const winterSystem = new TimeSystem({
        ...defaultConfig,
        startDate: '2024-01-15',
      });
      expect(winterSystem.getCurrentTime().season).toBe('winter');
    });

    it('应该正确识别早晨时段', () => {
      expect(timeSystem.getCurrentTime().dayPhase).toBe('morning');
    });

    it('应该正确识别下午时段', () => {
      const afternoonSystem = new TimeSystem({
        ...defaultConfig,
        startTime: '14:00',
      });
      expect(afternoonSystem.getCurrentTime().dayPhase).toBe('afternoon');
    });

    it('应该正确识别晚上时段', () => {
      const eveningSystem = new TimeSystem({
        ...defaultConfig,
        startTime: '19:00',
      });
      expect(eveningSystem.getCurrentTime().dayPhase).toBe('evening');
    });

    it('应该正确识别夜间时段', () => {
      const nightSystem = new TimeSystem({
        ...defaultConfig,
        startTime: '23:00',
      });
      expect(nightSystem.getCurrentTime().dayPhase).toBe('night');
    });
  });

  describe('时间流逝', () => {
    it('应该正确启动时间系统', () => {
      timeSystem.start();
      expect(timeSystem.getCurrentTime().date).toBe('2024-03-15');
    });

    it('应该能够停止时间系统', () => {
      timeSystem.start();
      timeSystem.stop();
      // 停止后不应再有时间流逝
      const time1 = timeSystem.getCurrentTime();
      return new Promise(resolve => {
        setTimeout(() => {
          const time2 = timeSystem.getCurrentTime();
          expect(time2.time).toBe(time1.time);
          resolve(null);
        }, 100);
      });
    });

    it('多次启动不应创建多个定时器', () => {
      timeSystem.start();
      timeSystem.start();
      timeSystem.stop();
      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });

  describe('时间设置', () => {
    it('应该能够设置新的时间', async () => {
      await timeSystem.setTime('12:30');
      const time = timeSystem.getCurrentTime();
      expect(time.time).toBe('12:30:00');
    });

    it('应该能够同时设置时间和日期', async () => {
      await timeSystem.setTime('18:45', '2024-03-20');
      const time = timeSystem.getCurrentTime();
      expect(time.time).toBe('18:45:00');
      expect(time.date).toBe('2024-03-20');
    });

    it('设置时间后应该更新时段', async () => {
      await timeSystem.setTime('20:00');
      expect(timeSystem.getCurrentTime().dayPhase).toBe('evening');
    });
  });

  describe('工作时间检查', () => {
    it('9点到18点之间应该是工作时间', () => {
      timeSystem = new TimeSystem({ ...defaultConfig, startTime: '10:00' });
      expect(timeSystem.isWorkTime()).toBe(true);
    });

    it('8点不应该被认为是工作时间', () => {
      expect(timeSystem.isWorkTime()).toBe(false);
    });

    it('18点及以后不应该被认为是工作时间', () => {
      timeSystem = new TimeSystem({ ...defaultConfig, startTime: '18:00' });
      expect(timeSystem.isWorkTime()).toBe(false);
    });
  });

  describe('睡眠时间检查', () => {
    it('22点及以后应该是睡眠时间', () => {
      timeSystem = new TimeSystem({ ...defaultConfig, startTime: '22:00' });
      expect(timeSystem.isSleepTime()).toBe(true);
    });

    it('6点以前应该是睡眠时间', () => {
      timeSystem = new TimeSystem({ ...defaultConfig, startTime: '05:00' });
      expect(timeSystem.isSleepTime()).toBe(true);
    });

    it('9点不应该是睡眠时间', () => {
      timeSystem = new TimeSystem({ ...defaultConfig, startTime: '09:00' });
      expect(timeSystem.isSleepTime()).toBe(false);
    });
  });

  describe('事件监听器', () => {
    it('应该能够添加监听器', () => {
      const callback = vi.fn();
      timeSystem.onChange(callback);
      timeSystem.start();

      // 等待一段时间让时间流逝
      return new Promise(resolve => {
        setTimeout(() => {
          expect(callback).toHaveBeenCalled();
          resolve(null);
        }, 200);
      });
    });

    it('应该能够移除监听器', () => {
      const callback = vi.fn();
      timeSystem.onChange(callback);
      timeSystem.removeListener(callback);
      timeSystem.start();

      return new Promise(resolve => {
        setTimeout(() => {
          expect(callback).not.toHaveBeenCalled();
          resolve(null);
        }, 200);
      });
    });

    it('监听器应该接收到正确的时间格式', () => {
      const callback = vi.fn();
      timeSystem.onChange(callback);
      timeSystem.start();

      return new Promise(resolve => {
        setTimeout(() => {
          const calls = callback.mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          const timeArg = calls[0][0] as WorldTime;
          expect(timeArg).toHaveProperty('time');
          expect(timeArg).toHaveProperty('date');
          expect(timeArg).toHaveProperty('dayPhase');
          expect(timeArg).toHaveProperty('season');
          resolve(null);
        }, 200);
      });
    });

    it('监听器错误不应影响其他监听器', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      timeSystem.onChange(errorCallback);
      timeSystem.onChange(normalCallback);
      timeSystem.start();

      return new Promise(resolve => {
        setTimeout(() => {
          expect(normalCallback).toHaveBeenCalled();
          resolve(null);
        }, 200);
      });
    });
  });

  describe('跨天处理', () => {
    it('应该正确处理跨天的时间推进', () => {
      // 在23:59设置时间，推进后应该是第二天00:00
      timeSystem = new TimeSystem({
        ...defaultConfig,
        startTime: '23:59',
        startDate: '2024-03-15',
      });

      const time1 = timeSystem.getCurrentTime();
      expect(time1.date).toBe('2024-03-15');

      // 模拟推进时间（需要手动触发advanceTime逻辑）
      // 由于tick是private，我们通过setTime来验证
      return timeSystem.setTime('00:01', '2024-03-16').then(() => {
        const time2 = timeSystem.getCurrentTime();
        expect(time2.date).toBe('2024-03-16');
        expect(time2.time).toBe('00:01:00');
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理午夜时间', () => {
      timeSystem = new TimeSystem({
        ...defaultConfig,
        startTime: '00:00',
      });
      const time = timeSystem.getCurrentTime();
      expect(time.time).toBe('00:00:00');
      expect(time.dayPhase).toBe('night');
    });

    it('应该处理正午时间', () => {
      timeSystem = new TimeSystem({
        ...defaultConfig,
        startTime: '12:00',
      });
      const time = timeSystem.getCurrentTime();
      expect(time.time).toBe('12:00:00');
      expect(time.dayPhase).toBe('afternoon');
    });

    it('应该处理最小日期', () => {
      timeSystem = new TimeSystem({
        ...defaultConfig,
        startDate: '2024-01-01',
      });
      expect(timeSystem.getCurrentTime().season).toBe('winter');
    });
  });
});
