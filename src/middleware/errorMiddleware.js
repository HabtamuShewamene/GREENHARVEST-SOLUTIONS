// Added during the structure refactor to centralize reusable error handling.
const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Unhandled application error:", {
    message: error.message,
    code: error.code,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(error.status || 500).json({
    message: error.statusCode && error.statusCode < 500 ? error.message : "Internal server error",
  });
};

module.exports = errorMiddleware;
