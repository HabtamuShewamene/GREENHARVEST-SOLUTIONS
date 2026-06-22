// Lightweight structured logger with timestamps for production debugging.
const serializeMeta = (meta = {}) => {
  return Object.entries(meta).reduce((accumulator, [key, value]) => {
    if (value instanceof Error) {
      accumulator[key] = {
        message: value.message,
        stack: value.stack,
      };
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
};

const buildLogPayload = (level, message, meta = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...serializeMeta(meta),
  };
};

const writeLog = (method, level, message, meta = {}) => {
  console[method](JSON.stringify(buildLogPayload(level, message, meta)));
};

const logger = {
  info(message, meta = {}) {
    writeLog("log", "info", message, meta);
  },
  warn(message, meta = {}) {
    writeLog("warn", "warn", message, meta);
  },
  error(message, meta = {}) {
    writeLog("error", "error", message, meta);
  },
};

module.exports = logger;
