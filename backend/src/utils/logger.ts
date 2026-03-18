// 日志工具

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const COLORS = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[90m',   // gray
  reset: '\x1b[0m',
};

class Logger {
  private prefix: string;

  constructor(prefix: string = 'AgentWorld') {
    this.prefix = prefix;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const color = COLORS[level];
    return `${color}[${timestamp}] [${this.prefix}] [${level.toUpperCase()}]${COLORS.reset} ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

export const logger = new Logger();

export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}
