// 时间系统

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';

const logger = createLogger('TimeSystem');

export interface TimeConfig {
  speed: number; // 时间流逝速度倍数，1=真实时间，10=10倍速
  startTime: string; // HH:MM
  startDate: string; // YYYY-MM-DD
}

export interface WorldTime {
  time: string; // HH:MM:SS
  date: string; // YYYY-MM-DD
  dayPhase: 'morning' | 'afternoon' | 'evening' | 'night';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

export class TimeSystem {
  private config: TimeConfig;
  private currentTime: WorldTime;
  private currentSeconds: number = 0; // 追踪当前秒数
  private interval: NodeJS.Timeout | null = null;
  private listeners: Array<(time: WorldTime) => void> = [];

  constructor(config: TimeConfig) {
    this.config = config;
    this.currentTime = this.parseDateTime(config.startDate, config.startTime);
    this.currentSeconds = 0;
  }

  /**
   * 启动时间系统
   */
  start(): void {
    if (this.interval) {
      return;
    }

    // 根据速度计算更新间隔
    // 速度1 = 每60秒更新1分钟，每1秒更新1秒
    // 速度10 = 每6秒更新1分钟，每0.6秒更新1秒
    const tickInterval = Math.max(100, 1000 / this.config.speed);

    this.interval = setInterval(() => {
      this.tick();
    }, tickInterval);

    logger.info(`TimeSystem started with speed ${this.config.speed}x`);
  }

  /**
   * 停止时间系统
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('TimeSystem stopped');
    }
  }

  /**
   * 时间流逝 - 每次调用增加一秒
   */
  private tick(): void {
    this.currentSeconds++;

    // 每60秒推进一分钟
    if (this.currentSeconds >= 60) {
      this.currentSeconds = 0;
      this.currentTime = this.advanceTime(this.currentTime, 1);
    }

    // 更新当前时间的秒数显示
    const timeWithSeconds = this.getCurrentTimeWithSeconds();
    this.notifyListeners();
  }

  /**
   * 获取带秒的时间
   */
  private getCurrentTimeWithSeconds(): WorldTime {
    const [hours, mins] = this.currentTime.time.split(':').map(Number);
    return {
      ...this.currentTime,
      time: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(this.currentSeconds).padStart(2, '0')}`,
    };
  }

  /**
   * 推进时间
   */
  private advanceTime(time: WorldTime, minutes: number): WorldTime {
    const [hours, mins] = time.time.split(':').map(Number);
    let totalMinutes = hours * 60 + mins + minutes;

    // 处理跨天
    let daysToAdd = 0;
    if (totalMinutes >= 1440) {
      daysToAdd = Math.floor(totalMinutes / 1440);
      totalMinutes = totalMinutes % 1440;
    }

    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;

    // 处理日期变更
    let newDate = time.date;
    if (daysToAdd > 0) {
      const date = new Date(time.date);
      date.setDate(date.getDate() + daysToAdd);
      newDate = date.toISOString().split('T')[0];
    }

    return {
      time: `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`,
      date: newDate,
      dayPhase: this.getDayPhase(newHours),
      season: this.getSeason(newDate),
    };
  }

  /**
   * 获取一天中的时段
   */
  private getDayPhase(hour: number): WorldTime['dayPhase'] {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * 根据日期获取季节
   */
  private getSeason(dateStr: string): WorldTime['season'] {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;

    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * 获取当前时间
   */
  getCurrentTime(): WorldTime {
    return this.getCurrentTimeWithSeconds();
  }

  /**
   * 添加时间变化监听器
   */
  onChange(callback: (time: WorldTime) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除时间变化监听器
   */
  removeListener(callback: (time: WorldTime) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.getCurrentTime());
      } catch (error) {
        logger.error('Error in time change listener', error);
      }
    }
  }

  /**
   * 保存时间到数据库
   */
  private async saveToDatabase(): Promise<void> {
    try {
      const currentTime = this.getCurrentTime();
      const db = getDatabase();
      await db.worldState.updateMany({
        data: {
          world_time: currentTime.time,
          world_date: currentTime.date,
          day_phase: currentTime.dayPhase,
          season: currentTime.season,
        },
      });
    } catch (error) {
      logger.error('Failed to save time to database', error);
    }
  }

  /**
   * 解析日期时间
   */
  private parseDateTime(date: string, time: string): WorldTime {
    const parts = time.split(':').map(Number);
    const hours = parts[0] || 0;
    const mins = parts[1] || 0;

    return {
      time: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`,
      date,
      dayPhase: this.getDayPhase(hours),
      season: this.getSeason(date),
    };
  }

  /**
   * 设置时间（用于测试或调试）
   */
  async setTime(time: string, date?: string): Promise<void> {
    this.currentTime = this.parseDateTime(
      date || this.currentTime.date,
      time
    );
    await this.saveToDatabase();
    this.notifyListeners();
    logger.info(`Time set to ${this.currentTime.date} ${this.currentTime.time}`);
  }

  /**
   * 检查是否是工作时间
   */
  isWorkTime(): boolean {
    const currentTime = this.getCurrentTime();
    const [hours] = currentTime.time.split(':').map(Number);
    return hours >= 9 && hours < 18;
  }

  /**
   * 检查是否是休息时间
   */
  isSleepTime(): boolean {
    const currentTime = this.getCurrentTime();
    const [hours] = currentTime.time.split(':').map(Number);
    return hours >= 22 || hours < 6;
  }
}
