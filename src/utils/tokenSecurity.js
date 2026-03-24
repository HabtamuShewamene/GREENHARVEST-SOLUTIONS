const crypto = require("crypto");
const { promises: dns } = require("dns");

const TOKEN_HASH_ALGORITHM = "sha256";

const generateOpaqueToken = (size = 32) => {
  return crypto.randomBytes(size).toString("hex");
};

const hashToken = (token) => {
  return crypto
    .createHash(TOKEN_HASH_ALGORITHM)
    .update(String(token))
    .digest("hex");
};

const generateNumericOtp = (digits = 6) => {
  const minimum = 10 ** (digits - 1);
  const maximum = 10 ** digits;
  return String(crypto.randomInt(minimum, maximum));
};

const addMinutes = (minutes) => {
  return new Date(Date.now() + Number(minutes) * 60 * 1000);
};

const addDays = (days) => {
  return new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);
};

const isExpired = (value) => {
  if (!value) {
    return true;
  }

  return new Date(value).getTime() <= Date.now();
};

const extractEmailDomain = (email) => {
  if (typeof email !== "string" || !email.includes("@")) {
    return "";
  }

  return email.trim().toLowerCase().split("@").pop() || "";
};

const hasResolvableMailDomain = async (email) => {
  const domain = extractEmailDomain(email);

  if (!domain) {
    return false;
  }

  try {
    const mxRecords = await dns.resolveMx(domain);

    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return true;
    }
  } catch (error) {
    try {
      const addressRecords = await dns.resolve(domain);
      return Array.isArray(addressRecords) && addressRecords.length > 0;
    } catch {
      return false;
    }
  }

  return false;
};

module.exports = {
  addDays,
  addMinutes,
  extractEmailDomain,
  generateNumericOtp,
  generateOpaqueToken,
  hasResolvableMailDomain,
  hashToken,
  isExpired,
};
