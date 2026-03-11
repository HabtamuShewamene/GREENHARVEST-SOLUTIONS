// Added during the structure refactor as a reusable logger utility.
const buildLogPayload = (level, message, meta = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
};

const logger = {
  info(message, meta = {}) {
    console.log(buildLogPayload("info", message, meta));
  },
  warn(message, meta = {}) {
    console.warn(buildLogPayload("warn", message, meta));
  },
  error(message, meta = {}) {
    console.error(buildLogPayload("error", message, meta));
  },
};

module.exports = logger;
