const rateLimit = require("express-rate-limit");

const shouldSkipRateLimit = () => {
  return process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT === "true";
};

const buildRateLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    max,
    skip: shouldSkipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return res.status(429).json({ message });
    },
  });
};

const loginRateLimiter = buildRateLimiter({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: "Too many login attempts. Please try again later.",
});

const forgotPasswordRateLimiter = buildRateLimiter({
  windowMs: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX) || 5,
  message: "Too many password reset requests. Please try again later.",
});

const refreshRateLimiter = buildRateLimiter({
  windowMs: Number(process.env.REFRESH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.REFRESH_RATE_LIMIT_MAX) || 30,
  message: "Too many token refresh attempts. Please try again later.",
});

module.exports = {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
};
