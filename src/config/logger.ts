import { env } from "@/config/env";
import { loggerEvents } from "@/core/utils/event-logger";
import path from "node:path";
import winston from "winston";

const isDevelopment = env.NODE_ENV !== "production";

const logsDir = path.resolve(process.cwd(), "logs");

const formatValue = (v: unknown, d = 0): string => {
  if (d > 2) return "[...]";
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") {
    const val = v.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    return val.length > 100 ? `"${val.slice(0, 100)}..."` : `"${val}"`;
  }
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    const items = v.slice(0, 3).map((i) => formatValue(i, d + 1));
    return v.length > 3
      ? `[${items.join(", ")}, ...]`
      : `[${items.join(", ")}]`;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (!keys.length) return "{}";
    if (keys.length <= 2) {
      return `{${keys
        .slice(0, 2)
        .map((k) => `${k}=${formatValue(o[k], d + 1)}`)
        .join(", ")}}`;
    }
    return `{${keys.slice(0, 2).join(", ")}, ...}`;
  }
  return String(v);
};

const formatMetadata = (meta: Record<string, unknown>): string => {
  const parts: string[] = [];
  // Error formatting
  if (meta.err instanceof Error) {
    parts.push(`error="${meta.err.message}"`);
    if (meta.err.stack && meta.err.stack !== meta.err.message) {
      const line = meta.err.stack.split("\n")[1];
      if (line) parts.push(`stack="${line.trim()}"`);
    }
  }
  if (meta.req && typeof meta.req === "object") {
    const req = meta.req as Record<string, unknown>;
    const r: string[] = [];
    if (req.method) r.push(`${req.method}`);
    if (req.url) r.push(req.url as string);
    if (req.id) r.push(`id=${req.id}`);
    if (req.remoteAddress) r.push(`ip=${req.remoteAddress}`);
    if (
      req.query &&
      typeof req.query === "object" &&
      Object.keys(req.query).length
    )
      r.push(`query=${formatValue(req.query, 1)}`);
    if (
      req.params &&
      typeof req.params === "object" &&
      Object.keys(req.params).length
    )
      r.push(`params=${formatValue(req.params, 1)}`);
    parts.push(`req={${r.join(" ")}}`);
  }
  if (meta.res && typeof meta.res === "object") {
    const res = meta.res as Record<string, unknown>;
    if (res.statusCode) parts.push(`res={status=${res.statusCode}}`);
  }
  for (const [k, v] of Object.entries(meta)) {
    if (k === "err" || k === "req" || k === "res") continue;
    parts.push(`${k}=${formatValue(v)}`);
  }
  return parts.length ? parts.join(" ") : "";
};

// Strip ANSI escape codes from strings
const stripAnsi = (str: string): string => {
  // Match ANSI escape sequences: ESC[ followed by digits/semicolons and ending with 'm'
  const esc = String.fromCharCode(27);
  const ansiRegex = new RegExp(`${esc}\\[[0-9;]*m`, "g");
  return str.replace(ansiRegex, "");
};

// Better date format: YYYY-MM-DD HH:mm:ss.SSS
const timestampFormat = "YYYY-MM-DD HH:mm:ss.SSS";

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: timestampFormat }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    // If message is empty but we have metadata, try to format it
    let displayMessage = message;
    if (!displayMessage && Object.keys(meta).length > 0) {
      // Try to create a readable message from metadata
      const metaKeys = Object.keys(meta);
      const firstKey = metaKeys[0];
      if (metaKeys.length === 1 && firstKey && firstKey !== "err" && firstKey !== "req" && firstKey !== "res") {
        displayMessage = formatValue(meta[firstKey]);
      }
    }
    const metaStr = formatMetadata(meta as Record<string, unknown>);
    return `[${timestamp}] ${level}: ${displayMessage || ""}${metaStr ? ` ${metaStr}` : ""
      }`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: timestampFormat }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = formatMetadata(meta as Record<string, unknown>);
    // Strip ANSI codes from message and level for file output
    const cleanMessage = typeof message === "string" ? stripAnsi(message) : message;
    const cleanLevel = typeof level === "string" ? stripAnsi(level) : level;
    const cleanMetaStr = metaStr ? stripAnsi(metaStr) : "";
    return `[${timestamp}] ${cleanLevel}: ${cleanMessage}${cleanMetaStr ? ` ${cleanMetaStr}` : ""
      }`;
  })
);

// Custom transport to emit log events
class EventEmitterTransport extends winston.transports.Console {
  log(info: winston.LogEntry, callback: () => void): void {
    // Extract data from the log entry before formatting
    const { level, message, timestamp, ...meta } = info;

    // Format log message similar to console format
    let displayMessage = message;
    if (!displayMessage && Object.keys(meta).length > 0) {
      const metaKeys = Object.keys(meta);
      const firstKey = metaKeys[0];
      if (metaKeys.length === 1 && firstKey && firstKey !== "err" && firstKey !== "req" && firstKey !== "res") {
        displayMessage = formatValue(meta[firstKey]);
      }
    }
    const metaStr = formatMetadata(meta as Record<string, unknown>);
    const formattedMessage = `[${timestamp}] ${level}: ${displayMessage || ""}${metaStr ? ` ${metaStr}` : ""
      }`;

    // Emit log event for real-time streaming
    try {
      loggerEvents.emitLog(level, formattedMessage, meta);
    } catch (err) {
      // Don't break logging if event emission fails
      console.error("Error emitting log event:", err);
    }

    // Call parent log method (Console transport always has log method)
    winston.transports.Console.prototype.log.call(this, info, callback);
  }
}

const logLevel = env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

const transports: winston.transport[] = [
  new EventEmitterTransport({
    format: consoleFormat,
  }),
  new winston.transports.File({
    filename: path.join(logsDir, "combined.log"),
    format: fileFormat,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
  }),
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: fileFormat,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
  }),
];

const winstonLogger = winston.createLogger({
  level: logLevel,
  format: fileFormat,
  transports,
});

// Log the current log level on startup for debugging
if (isDevelopment) {
  winstonLogger.debug(`Logger initialized with level: ${logLevel}`);
}

const createLoggerMethod =
  (level: string) => (metaOrMsg: unknown, msg?: string) => {
    if (typeof metaOrMsg === "string") {
      winstonLogger.log(level, metaOrMsg);
    } else if (msg) {
      winstonLogger.log(level, msg, metaOrMsg);
    } else if (metaOrMsg && typeof metaOrMsg === "object") {
      // Convert object to readable string for message
      try {
        const objStr = JSON.stringify(metaOrMsg, null, 2);
        winstonLogger.log(level, objStr.length > 500 ? objStr.slice(0, 500) + "..." : objStr, metaOrMsg);
      } catch {
        winstonLogger.log(level, String(metaOrMsg), metaOrMsg);
      }
    } else {
      // Convert non-string, non-object values to string
      winstonLogger.log(level, String(metaOrMsg));
    }
  };

const createChildLoggerMethod =
  (level: string, childLogger: winston.Logger) =>
    (metaOrMsg: unknown, msg?: string) => {
      if (typeof metaOrMsg === "string") {
        childLogger.log(level, metaOrMsg);
      } else if (msg) {
        childLogger.log(level, msg, metaOrMsg);
      } else if (metaOrMsg && typeof metaOrMsg === "object") {
        childLogger.log(level, "", metaOrMsg);
      } else {
        childLogger.log(level, metaOrMsg);
      }
    };

const logger = {
  info: createLoggerMethod("info"),
  error: createLoggerMethod("error"),
  warn: createLoggerMethod("warn"),
  debug: createLoggerMethod("debug"),
  trace: createLoggerMethod("debug"),
  fatal: createLoggerMethod("error"),
  child: (bindings: Record<string, unknown>) => {
    const childLogger = winston.createLogger({
      level: winstonLogger.level,
      format: winstonLogger.format,
      defaultMeta: { ...bindings },
      transports,
    });
    return {
      info: createChildLoggerMethod("info", childLogger),
      error: createChildLoggerMethod("error", childLogger),
      warn: createChildLoggerMethod("warn", childLogger),
      debug: createChildLoggerMethod("debug", childLogger),
      trace: createChildLoggerMethod("debug", childLogger),
      fatal: createChildLoggerMethod("error", childLogger),
    };
  },
};

export { logger };
export default logger;
