import { EventEmitter } from "node:events";

/**
 * Event emitter for real-time log streaming
 */
class LoggerEventEmitter extends EventEmitter {
  emitLog(level: string, message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    this.emit("log", logEntry);
  }
}

export const loggerEvents = new LoggerEventEmitter();
