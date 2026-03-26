// Authentication service that centralizes registration, login, tokens, and account security.
const bcrypt = require("bcrypt");

const authSecurityModel = require("../models/authSecurityModel");
const userModel = require("../models/userModel");
const emailService = require("./emailService");
const logger = require("../utils/logger");
const { getAccessTokenTtlMinutes, signAccessToken } = require("../utils/jwt");
const { ALLOWED_ROLES, normalizeRole } = require("../utils/roles");
const {
  addDays,
  addMinutes,
  generateNumericOtp,
  generateOpaqueToken,
  hasResolvableMailDomain,
  hashToken,
  isExpired,
} = require("../utils/tokenSecurity");
const {
  getMissingRequiredFields,
  isStrongPassword,
  isValidEmail,
} = require("../utils/validators");

const allowedRoles = ALLOWED_ROLES;

const createServiceError = (message, statusCode, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

const buildUserPayload = (user) => {
  return {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role_name || user.role),
  };
};

const buildSessionUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role_name || user.role),
    role_name: user.role_name || user.role,
    phone: user.phone,
    address: user.address,
    created_at: user.created_at,
    is_verified: Boolean(user.is_verified),
    mfa_enabled: Boolean(user.mfa_enabled),
    last_login_at: user.last_login_at || null,
  };
};

const getRefreshTokenTtlDays = () => {
  const configuredValue = Number(process.env.REFRESH_TOKEN_TTL_DAYS);
  return Number.isInteger(configuredValue) && configuredValue > 0 ? configuredValue : 7;
};

const getVerificationExpiryMinutes = () => {
  const configuredValue = Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES);
  return Number.isInteger(configuredValue) && configuredValue > 0 ? configuredValue : 60 * 24;
};

const getPasswordResetExpiryMinutes = () => {
  const configuredValue = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES);
  return Number.isInteger(configuredValue) && configuredValue > 0 ? configuredValue : 15;
};

const getMfaOtpExpiryMinutes = () => {
  const configuredValue = Number(process.env.MFA_OTP_TTL_MINUTES);
  return Number.isInteger(configuredValue) && configuredValue > 0 ? configuredValue : 5;
};

const isEmailVerificationRequired = () => {
  return process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== "false";
};

const shouldCheckEmailDomain = () => {
  return process.env.ENABLE_EMAIL_DOMAIN_CHECK === "true";
};

const issueAccessToken = (user) => {
  return signAccessToken(buildUserPayload(user));
};

const buildSessionResponse = ({ user, access_token, refresh_token }) => {
  const response = {
    access_token,
    token: access_token,
    token_type: "Bearer",
    expires_in_minutes: getAccessTokenTtlMinutes(),
    user: buildSessionUser(user),
  };

  if (process.env.NODE_ENV === "test" || process.env.EXPOSE_REFRESH_TOKEN_IN_BODY === "true") {
    response.refresh_token = refresh_token;
  }

  return response;
};

const createRefreshSession = async ({
  user,
  family_id = null,
  created_by_ip = null,
  user_agent = null,
}) => {
  const access_token = issueAccessToken(user);
  const refresh_token = generateOpaqueToken(48);
  const token_hash = hashToken(refresh_token);
  const sessionFamilyId = family_id || generateOpaqueToken(16);

  await authSecurityModel.createRefreshToken({
    user_id: user.id,
    token_hash,
    family_id: sessionFamilyId,
    expires_at: addDays(getRefreshTokenTtlDays()),
    created_by_ip,
    user_agent,
  });

  return {
    ...buildSessionResponse({
      user,
      access_token,
      refresh_token,
    }),
    refresh_token,
    family_id: sessionFamilyId,
  };
};

const validateEmailDomainIfEnabled = async (email) => {
  if (!shouldCheckEmailDomain()) {
    return;
  }

  const hasValidDomain = await hasResolvableMailDomain(email);

  if (!hasValidDomain) {
    throw createServiceError("Email domain could not be verified", 400);
  }
};

const createEmailVerification = async (user) => {
  const verification_token = generateOpaqueToken(32);
  const verification_token_hash = hashToken(verification_token);
  const verification_token_expiry = addMinutes(getVerificationExpiryMinutes());

  await userModel.storeEmailVerificationToken({
    user_id: user.id,
    token_hash: verification_token_hash,
    expires_at: verification_token_expiry,
  });

  await emailService.sendVerificationEmail({
    email: user.email,
    name: user.name,
    token: verification_token,
  });

  return {
    verification_token_expiry,
  };
};

const generateToken = (user) => {
  return issueAccessToken(user);
};

const registerUser = async ({
  name,
  email,
  password,
  role,
  backup_email = null,
  recovery_phone = null,
}) => {
  const missingFields = getMissingRequiredFields(
    { name, email, password, role },
    ["name", "email", "password", "role"]
  );

  if (missingFields.length > 0) {
    throw createServiceError(
      `${missingFields.join(", ")} ${missingFields.length > 1 ? "are" : "is"} required`,
      400
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (!isValidEmail(normalizedEmail)) {
    throw createServiceError("A valid email address is required", 400);
  }

  await validateEmailDomainIfEnabled(normalizedEmail);

  if (backup_email !== null && backup_email !== undefined) {
    if (!isValidEmail(backup_email)) {
      throw createServiceError("backup_email must be a valid email address", 400);
    }

    await validateEmailDomainIfEnabled(backup_email);
  }

  if (!allowedRoles.includes(normalizedRole)) {
    throw createServiceError("Invalid role provided", 400);
  }

  if (!isStrongPassword(password)) {
    throw createServiceError(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      400
    );
  }

  const existingUser = await userModel.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw createServiceError("User already exists with this email", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userModel.createUser({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: normalizedRole,
    backup_email: backup_email ? backup_email.trim().toLowerCase() : null,
    recovery_phone: recovery_phone ? String(recovery_phone).trim() : null,
  });

  await createEmailVerification(user);

  logger.info("User registered successfully", {
    userId: user.id,
    role: user.role,
  });

  return {
    user: buildSessionUser(user),
    requires_email_verification: true,
  };
};

const loginUser = async ({ email, password, ip = null, userAgent = null }) => {
  const missingFields = getMissingRequiredFields({ email, password }, ["email", "password"]);

  if (missingFields.length > 0) {
    throw createServiceError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw createServiceError("A valid email address is required", 400);
  }

  const user = await userModel.findUserByEmail(normalizedEmail);

  if (!user) {
    throw createServiceError("Invalid credentials", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createServiceError("Invalid credentials", 401);
  }

  if (isEmailVerificationRequired() && user.is_verified === false) {
    throw createServiceError("Please verify your email before logging in", 403, {
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  if (user.mfa_enabled) {
    const otp = generateNumericOtp(6);
    const challenge_token = generateOpaqueToken(24);
    const expires_at = addMinutes(getMfaOtpExpiryMinutes());

    await authSecurityModel.createOtpChallenge({
      user_id: user.id,
      purpose: "login",
      challenge_hash: hashToken(challenge_token),
      otp_hash: hashToken(otp),
      expires_at,
    });

    await emailService.sendMfaOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });

    return {
      mfa_required: true,
      challenge_token,
      challenge_expires_at: expires_at,
      user: buildSessionUser(user),
    };
  }

  await userModel.updateLastLoginAt(user.id);
  return createRefreshSession({
    user,
    created_by_ip: ip,
    user_agent: userAgent,
  });
};

const refreshSession = async ({ refresh_token, ip = null, userAgent = null }) => {
  if (!refresh_token || !String(refresh_token).trim()) {
    throw createServiceError("refresh_token is required", 400);
  }

  const refreshTokenHash = hashToken(refresh_token.trim());
  const storedToken = await authSecurityModel.findRefreshTokenByHash(refreshTokenHash);

  if (!storedToken) {
    throw createServiceError("Invalid refresh token", 401);
  }

  if (storedToken.revoked_at) {
    await authSecurityModel.revokeRefreshTokenFamily(storedToken.family_id, "reuse_detected");
    await authSecurityModel.revokeRefreshTokensForUser(storedToken.user_id, "reuse_detected");
    throw createServiceError("Refresh token reuse detected", 401);
  }

  if (isExpired(storedToken.expires_at)) {
    await authSecurityModel.revokeRefreshTokenById(storedToken.id, {
      revoked_reason: "expired",
    });
    throw createServiceError("Refresh token expired", 401);
  }

  const user = await userModel.findUserById(storedToken.user_id);

  if (!user) {
    throw createServiceError("User not found", 404);
  }

  const nextSession = await createRefreshSession({
    user,
    family_id: storedToken.family_id,
    created_by_ip: ip,
    user_agent: userAgent,
  });

  await authSecurityModel.revokeRefreshTokenById(storedToken.id, {
    replaced_by_token_hash: hashToken(nextSession.refresh_token),
    revoked_reason: "rotated",
  });

  return nextSession;
};

const logoutUser = async ({ refresh_token, actor = null, all_devices = false }) => {
  if (all_devices) {
    if (!actor || !actor.user_id) {
      throw createServiceError("Authentication is required for logout from all devices", 401);
    }

    await authSecurityModel.revokeRefreshTokensForUser(actor.user_id, "logout_all");
    return { logout_all: true };
  }

  if (refresh_token && String(refresh_token).trim()) {
    const refreshTokenHash = hashToken(String(refresh_token).trim());
    const storedToken = await authSecurityModel.findRefreshTokenByHash(refreshTokenHash);

    if (storedToken) {
      await authSecurityModel.revokeRefreshTokenById(storedToken.id, {
        revoked_reason: "logout",
      });
    }
  }

  return { logout_all: false };
};

const forgotPassword = async ({ email }) => {
  if (!email || !String(email).trim()) {
    throw createServiceError("Email is required", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw createServiceError("A valid email address is required", 400);
  }

  const user = await userModel.findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  }

  const reset_token = generateOpaqueToken(32);
  const reset_token_hash = hashToken(reset_token);
  const reset_token_expiry = addMinutes(getPasswordResetExpiryMinutes());

  await userModel.storePasswordResetToken({
    user_id: user.id,
    token_hash: reset_token_hash,
    expires_at: reset_token_expiry,
  });

  await emailService.sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    token: reset_token,
  });

  return {
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };
};

const resetPassword = async ({ token, new_password }) => {
  const missingFields = getMissingRequiredFields(
    { token, new_password },
    ["token", "new_password"]
  );

  if (missingFields.length > 0) {
    throw createServiceError("token and new_password are required", 400);
  }

  if (!isStrongPassword(new_password)) {
    throw createServiceError(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      400
    );
  }

  const hashedResetToken = hashToken(token);
  const user = await userModel.findUserByPasswordResetToken(hashedResetToken);

  if (!user || isExpired(user.password_reset_token_expiry)) {
    throw createServiceError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);

  await userModel.updateUserPassword({
    user_id: user.id,
    password_hash: hashedPassword,
  });
  await userModel.clearPasswordResetToken(user.id);
  await authSecurityModel.revokeRefreshTokensForUser(user.id, "password_reset");

  return {
    message: "Password reset successfully",
  };
};

const verifyEmail = async ({ token }) => {
  if (!token || !String(token).trim()) {
    throw createServiceError("Verification token is required", 400);
  }

  const user = await userModel.findUserByVerificationToken(hashToken(token));

  if (!user || isExpired(user.verification_token_expiry)) {
    throw createServiceError("Invalid or expired verification token", 400);
  }

  await userModel.markEmailVerified(user.id);

  return {
    message: "Email verified successfully",
  };
};

const verifyOtp = async ({ challenge_token, otp, ip = null, userAgent = null }) => {
  const missingFields = getMissingRequiredFields(
    { challenge_token, otp },
    ["challenge_token", "otp"]
  );

  if (missingFields.length > 0) {
    throw createServiceError("challenge_token and otp are required", 400);
  }

  const challenge = await authSecurityModel.findOtpChallengeByHash(
    hashToken(challenge_token),
    "login"
  );

  if (!challenge || challenge.consumed_at || isExpired(challenge.expires_at)) {
    throw createServiceError("Invalid or expired OTP challenge", 400);
  }

  if (challenge.attempts >= 5) {
    await authSecurityModel.consumeOtpChallenge(challenge.id);
    throw createServiceError("OTP challenge has been locked", 400);
  }

  if (hashToken(otp) !== challenge.otp_hash) {
    await authSecurityModel.incrementOtpAttempts(challenge.id);
    throw createServiceError("Invalid OTP", 400);
  }

  await authSecurityModel.consumeOtpChallenge(challenge.id);

  const user = await userModel.findUserById(challenge.user_id);

  if (!user) {
    throw createServiceError("User not found", 404);
  }

  await userModel.updateLastLoginAt(user.id);
  return createRefreshSession({
    user,
    created_by_ip: ip,
    user_agent: userAgent,
  });
};

const updateMfaPreference = async ({ user_id, password, enabled }) => {
  if (password === undefined || password === null || !String(password).trim()) {
    throw createServiceError("password is required", 400);
  }

  const user = await userModel.findUserByIdWithPassword(user_id);

  if (!user) {
    throw createServiceError("User not found", 404);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createServiceError("Invalid credentials", 401);
  }

  if (enabled && isEmailVerificationRequired() && user.is_verified === false) {
    throw createServiceError("Verify your email before enabling MFA", 400);
  }

  await userModel.updateMfaPreference({
    user_id,
    enabled: Boolean(enabled),
  });

  return {
    mfa_enabled: Boolean(enabled),
  };
};

const getUserProfile = async (userId) => {
  const user = await userModel.findUserById(userId);

  if (!user) {
    throw createServiceError("User not found", 404);
  }

  return user;
};

module.exports = {
  allowedRoles,
  forgotPassword,
  generateToken,
  getUserProfile,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  resetPassword,
  updateMfaPreference,
  verifyEmail,
  verifyOtp,
};
