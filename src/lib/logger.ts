import { redactSecrets, sanitizeLogData } from "./utils";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI terminal color codes for development visibility
const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[90m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  brightCyan: "\x1b[96m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  yellow: "\x1b[33m",
  brightYellow: "\x1b[93m",
  red: "\x1b[31m",
  brightRed: "\x1b[91m",
  magenta: "\x1b[35m",
  brightMagenta: "\x1b[95m",
  blue: "\x1b[34m",
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: `${ANSI.magenta}${ANSI.bold}[DEBUG]${ANSI.reset}`,
  info: `${ANSI.cyan}${ANSI.bold}[INFO]${ANSI.reset}`,
  warn: `${ANSI.yellow}${ANSI.bold}[WARN]${ANSI.reset}`,
  error: `${ANSI.brightRed}${ANSI.bold}[ERROR]${ANSI.reset}`,
};

export interface LogContext {
  module?: string;
  requestId?: string;
  threadId?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

function resolveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel?: LogLevel) {
    this.context = context;
    this.minLevel = minLevel || resolveLogLevel();
  }

  /**
   * Creates a child logger with bound contextual metadata.
   */
  child(extraContext: LogContext): Logger {
    return new Logger({ ...this.context, ...extraContext }, this.minLevel);
  }

  /**
   * Sets the minimum log level for this logger instance.
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private output(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const cleanMessage = redactSecrets(message);
    const combinedMeta = sanitizeLogData({
      ...this.context,
      ...(meta || {}),
    });

    const isProduction = process.env.NODE_ENV === "production";
    const forcePretty = process.env.LOG_FORMAT === "pretty";

    if (isProduction && !forcePretty) {
      // Structured JSON log line for cloud observability (Datadog, CloudWatch, OpenTelemetry)
      const entry = {
        level,
        timestamp,
        message: cleanMessage,
        ...combinedMeta,
      };
      const jsonLine = JSON.stringify(entry);
      if (level === "error") {
        console.error(jsonLine);
      } else if (level === "warn") {
        console.warn(jsonLine);
      } else {
        console.log(jsonLine);
      }
    } else {
      // Vivid color-coded human-readable format for local development
      const levelBadge = LEVEL_COLORS[level];
      const moduleBadge = this.context.module
        ? `${ANSI.brightGreen}${ANSI.bold}[${this.context.module}]${ANSI.reset}`
        : "";
      const reqBadge = this.context.requestId
        ? `${ANSI.dim}[${this.context.requestId}]${ANSI.reset}`
        : "";

      const metaKeys = Object.keys(combinedMeta).filter(
        (k) => k !== "module" && k !== "requestId"
      );

      const metaSuffix =
        metaKeys.length > 0
          ? ` ${ANSI.dim}${JSON.stringify(
              Object.fromEntries(metaKeys.map((k) => [k, combinedMeta[k]]))
            )}${ANSI.reset}`
          : "";

      const fullLog = `${levelBadge} ${moduleBadge} ${reqBadge} ${cleanMessage}${metaSuffix}`
        .replace(/\s+/g, " ")
        .trim();

      if (level === "error") {
        console.error(fullLog);
      } else if (level === "warn") {
        console.warn(fullLog);
      } else {
        console.log(fullLog);
      }
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.output("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.output("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.output("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.output("error", message, meta);
  }

  /**
   * Helper to measure async execution time and log completion / error.
   */
  async time<T>(
    operationName: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      this.info(`${operationName} completed`, { ...meta, durationMs });
      return result;
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      this.error(`${operationName} failed: ${msg}`, { ...meta, durationMs, error: err });
      throw err;
    }
  }
}

/**
 * Root default application logger.
 */
export const logger = new Logger();
