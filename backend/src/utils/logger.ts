import * as winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Sensitive fields that should be masked in logs. Substring match (case-insensitive),
// so `passwordHash`, `keyHash`, `webhookSecret`, `clientSecret`, `setCookie` are all caught.
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'apiKey',
  'keyHash',
  'secret',
  'webhookSecret',
  'clientSecret',
  'authorization',
  'bearer',
  'cookie',
  'setCookie',
  'signature',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
];

// Mask sensitive data in log objects. Recurses into arrays so a list of
// authorization headers or token strings doesn't sneak through.
const maskSensitiveData = (obj: Record<string, unknown>): Record<string, unknown> => {
  if (!obj || typeof obj !== 'object') return obj;

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      masked[key] = value.map((v) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? maskSensitiveData(v as Record<string, unknown>)
          : v
      );
    } else if (value && typeof value === 'object') {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
};

// Custom format to mask sensitive data
const maskFormat = winston.format((info) => {
  if (info.meta && typeof info.meta === 'object') {
    info.meta = maskSensitiveData(info.meta as Record<string, unknown>);
  }
  // Also check the info object itself for sensitive data
  return maskSensitiveData(info as Record<string, unknown>) as winston.Logform.TransformableInfo;
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
