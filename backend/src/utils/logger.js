/**
 * Production-ready logger utility
 * Replaces console.log statements with environment-aware logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor(module) {
    this.module = module;
  }

  _shouldLog(level) {
    if (isTest) return false;
    return LOG_LEVELS[level] <= LOG_LEVELS[LOG_LEVEL];
  }

  _formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}${metaStr}`;
  }

  error(message, error) {
    if (this._shouldLog('error')) {
      const errorMeta = error ? { 
        message: error.message, 
        stack: isDevelopment ? error.stack : undefined 
      } : undefined;
      console.error(this._formatMessage('error', message, errorMeta));
    }
  }

  warn(message, meta) {
    if (this._shouldLog('warn')) {
      console.warn(this._formatMessage('warn', message, meta));
    }
  }

  info(message, meta) {
    if (this._shouldLog('info')) {
      console.info(this._formatMessage('info', message, meta));
    }
  }

  debug(message, meta) {
    if (this._shouldLog('debug') && isDevelopment) {
      console.log(this._formatMessage('debug', message, meta));
    }
  }

  // For critical startup messages that should always show
  startup(message) {
    console.log(`[STARTUP] ${message}`);
  }
}

module.exports = (module) => new Logger(module);