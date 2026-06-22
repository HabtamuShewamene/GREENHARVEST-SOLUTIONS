const logger = require("../utils/logger");

const requestLoggerMiddleware = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("HTTP request", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user && req.user.id ? req.user.id : null,
      ip: req.ip,
    });
  });

  next();
};

module.exports = requestLoggerMiddleware;
