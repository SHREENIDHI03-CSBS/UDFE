const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'ufde.log');

function write(level, message, meta) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const str = JSON.stringify(line);
  // Console output for live demo visibility
  // eslint-disable-next-line no-console
  console.log(str);
  fs.appendFile(logFile, str + '\n', () => {});
}

module.exports = {
  info: (message, meta) => write('INFO', message, meta),
  warn: (message, meta) => write('WARN', message, meta),
  error: (message, meta) => write('ERROR', message, meta),
  debug: (message, meta) => write('DEBUG', message, meta),
};
