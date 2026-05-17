const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  AUDIT: 'AUDIT'
};

const logFile = path.join(process.cwd(), 'logs', 'app.log');

if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

const formatLog = (level, action, data = {}, actor = 'SYSTEM') => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    actor,
    action,
    ...data
  }) + '\n';
};

const writeLogAsync = (entry) => {
  fsPromises.appendFile(logFile, entry).catch((err) => {
    console.error("[LOGGER] Non-blocking file append failed:", err.message);
  });
};

const logger = {
  info: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.INFO, action, data, actor);
    console.log(entry.trim());
    writeLogAsync(entry);
  },
  warn: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.WARN, action, data, actor);
    console.warn(entry.trim());
    writeLogAsync(entry);
  },
  error: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.ERROR, action, data, actor);
    console.error(entry.trim());
    writeLogAsync(entry);
  },
  audit: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.AUDIT, action, data, actor);
    console.log(`[AUDIT] ${entry.trim()}`);
    writeLogAsync(entry);
  }
};

module.exports = { logger };
