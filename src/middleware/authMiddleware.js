// Moved from middleware/authMiddleware.js during the structure refactor.
const jwt = require("jsonwebtoken");
const { normalizeRole } = require("../utils/roles");

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/);

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const authMiddleware = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      message: "Authorization token is required. Use: Authorization: Bearer <token>",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT verification failed: JWT_SECRET is not configured");
    return res.status(500).json({
      message: "Authentication service is not configured",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    req.user = {
      ...decoded,
      role: normalizeRole(decoded.role),
    };
    return next();
  } catch (error) {
    const errorContext = {
      name: error.name,
      message: error.message,
      path: req.originalUrl,
      method: req.method,
    };

    console.error("JWT verification failed:", errorContext);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;
