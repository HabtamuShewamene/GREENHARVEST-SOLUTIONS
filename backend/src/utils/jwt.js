// Added during the structure refactor as a reusable JWT helper.
const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const getAccessTokenTtlMinutes = () => {
  const configuredValue = Number(process.env.ACCESS_TOKEN_TTL_MINUTES);
  return Number.isInteger(configuredValue) && configuredValue > 0 ? configuredValue : 15;
};

const buildJwtOptions = (options = {}) => {
  return {
    expiresIn: `${getAccessTokenTtlMinutes()}m`,
    ...options,
  };
};

const signAccessToken = (payload, options = {}) => {
  return jwt.sign(
    {
      ...payload,
      token_type: "access",
    },
    getJwtSecret(),
    buildJwtOptions(options)
  );
};

const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    decoded &&
    typeof decoded === "object" &&
    decoded.token_type &&
    decoded.token_type !== "access"
  ) {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }

  return decoded;
};

const signToken = (payload, options = {}) => {
  return signAccessToken(payload, options);
};

const verifyToken = (token) => {
  return verifyAccessToken(token);
};

module.exports = {
  getAccessTokenTtlMinutes,
  signAccessToken,
  signToken,
  verifyAccessToken,
  verifyToken,
};
