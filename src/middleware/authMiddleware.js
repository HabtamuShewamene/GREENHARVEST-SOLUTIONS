// Moved from middleware/authMiddleware.js during the structure refactor.
const { normalizeRole } = require("../utils/roles");
const { pool } = require("../config/db");
const { verifyAccessToken } = require("../utils/jwt");

const resolveActorId = async (user_id, role) => {
  if (role === "admin") {
    return user_id;
  }

  if (role === "buyer") {
    const result = await pool.query(
      `
        INSERT INTO buyer_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id)
        DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING buyer_id
      `,
      [user_id]
    );

    return result.rows[0].buyer_id;
  }

  if (role === "farmer") {
    const result = await pool.query(
      `
        INSERT INTO farmer_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id)
        DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING farmer_id
      `,
      [user_id]
    );

    return result.rows[0].farmer_id;
  }

  if (role === "delivery_partner") {
    const result = await pool.query(
      `
        INSERT INTO delivery_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id)
        DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING delivery_id
      `,
      [user_id]
    );

    return result.rows[0].delivery_id;
  }

  if (role === "field_agent") {
    const result = await pool.query(
      `
        INSERT INTO field_agent_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id)
        DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING agent_id
      `,
      [user_id]
    );

    return result.rows[0].agent_id;
  }

  return user_id;
};

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

const authMiddleware = async (req, res, next) => {
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
    const decoded = verifyAccessToken(token);

    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const role = normalizeRole(decoded.role);
    const user_id = decoded.id;
    const actor_id = await resolveActorId(user_id, role);

    req.user = {
      ...decoded,
      id: actor_id,
      user_id,
      role,
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
