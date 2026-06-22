// Centralized Express error handler with consistent JSON responses.
const logger = require("../utils/logger");

const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  let message = error.message || "Internal server error";

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    message = "Invalid JSON payload";
  } else if (error.code === "23503") {
    message = "Referenced record does not exist";
  } else if (error.code === "23505") {
    message = "Record already exists";
  } else if (error.code === "22P02") {
    message = "Invalid input format";
  } else if (statusCode >= 500) {
    message = "Internal server error";
  }

  logger.error("Unhandled application error", {
    message: error.message,
    responseMessage: message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(statusCode).json({
    status: "error",
    message,
  });
};

module.exports = errorMiddleware;
