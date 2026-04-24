const fs = require('fs');
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

const logger = {
  info: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.INFO, action, data, actor);
    console.log(entry.trim());
    fs.appendFileSync(logFile, entry);
  },
  warn: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.WARN, action, data, actor);
    console.warn(entry.trim());
    fs.appendFileSync(logFile, entry);
  },
  error: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.ERROR, action, data, actor);
    console.error(entry.trim());
    fs.appendFileSync(logFile, entry);
  },
  audit: (action, data, actor) => {
    const entry = formatLog(LOG_LEVELS.AUDIT, action, data, actor);
    console.log(`[AUDIT] ${entry.trim()}`);
    fs.appendFileSync(logFile, entry);
  }
};

module.exports = { logger };
