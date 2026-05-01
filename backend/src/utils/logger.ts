import * as winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Sensitive field names — exact match on lowercased key (case-insensitive).
// Substring matching used to over-redact normal fields like `tokenPrefix`,
// `tokenized`, `passwordlessLogin`, etc., and would mask user-visible UI
// fields by accident.
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'apikey',
  'keyhash',
  'secret',
  'webhooksecret',
  'clientsecret',
  'authorization',
  'bearer',
  'cookie',
  'setcookie',
  'signature',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn',
]);

// Mutate `obj` in place so winston's symbol-keyed fields (LEVEL, MESSAGE,
// SPLAT) are preserved; the previous version returned a new object that
// silently dropped all symbol keys, breaking custom transports.
const maskSensitiveDataInPlace = (obj: Record<string, unknown>): void => {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      (obj as Record<string, unknown>)[key] = '[REDACTED]';
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          maskSensitiveDataInPlace(item as Record<string, unknown>);
        }
      }
    } else if (value && typeof value === 'object') {
      maskSensitiveDataInPlace(value as Record<string, unknown>);
    }
  }
};

// Custom format to mask sensitive data — operates IN PLACE on info so winston
// keeps its symbol-keyed fields.
const maskFormat = winston.format((info) => {
  if (info.meta && typeof info.meta === 'object') {
    maskSensitiveDataInPlace(info.meta as Record<string, unknown>);
  }
  maskSensitiveDataInPlace(info as Record<string, unknown>);
  return info;
});

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  maskFormat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info: winston.Logform.TransformableInfo) => {
    const { timestamp, level, message, ...meta } = info;
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'makeyourmusic-api' },
  transports: [
    // Always log to console (required for Railway/Docker to capture logs)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
});

// Add file transports in non-production environments (local dev)
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export default logger;
