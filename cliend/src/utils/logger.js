// Client-side logger utility
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const isDevelopment = import.meta.env.DEV;
const currentLevel = LOG_LEVELS[import.meta.env.VITE_LOG_LEVEL] || (isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);

const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level}:`;
  
  if (args.length > 0) {
    return [prefix, message, ...args];
  }
  
  return [prefix, message];
};

export const logger = {
  error: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(...formatMessage('ERROR', message, ...args));
    }
  },
  
  warn: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(...formatMessage('WARN', message, ...args));
    }
  },
  
  info: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(...formatMessage('INFO', message, ...args));
    }
  },
  
  debug: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log(...formatMessage('DEBUG', message, ...args));
    }
  }
};