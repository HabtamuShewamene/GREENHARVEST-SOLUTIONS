// Role-based authorization middleware for protected routes.
const logger = require("../utils/logger");
const { normalizeRole } = require("../utils/roles");

const roleMiddleware = (...allowedRoles) => {
  const normalizedRoles = allowedRoles
    .flat()
    .filter(Boolean)
    .map((role) => normalizeRole(role));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication is required",
      });
    }

    if (normalizedRoles.length === 0) {
      return next();
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedRoles.includes(userRole)) {
      const requiredRoles = normalizedRoles.join(", ");

      logger.warn("Access denied by role middleware", {
        userId: req.user.id,
        userRole,
        allowedRoles: normalizedRoles,
        path: req.originalUrl,
        method: req.method,
      });

      return res.status(403).json({
        status: "error",
        message: `Forbidden: insufficient permissions. Required role: ${requiredRoles}`,
      });
    }

    return next();
  };
};

module.exports = roleMiddleware;
