// Auth controller delegates business logic to the auth service.
const logger = require("../utils/logger");
const authService = require("../services/authService");
const {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
  shouldExposeRefreshToken,
} = require("../utils/cookies");

const handleControllerError = (res, context, error, meta = {}) => {
  logger.error(context, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    ...meta,
  });

  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Internal server error",
  });
};

const buildSessionResponseBody = (result, message) => {
  const responseBody = {
    message,
    access_token: result.access_token,
    token: result.token,
    token_type: result.token_type,
    expires_in_minutes: result.expires_in_minutes,
    user: result.user,
  };

  if (shouldExposeRefreshToken()) {
    responseBody.refresh_token = result.refresh_token;
  }

  return responseBody;
};

const registerUser = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body || {});

    return res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      ...result,
    });
  } catch (error) {
    return handleControllerError(res, "User registration failed", error, {
      body: req.body,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const result = await authService.loginUser({
      ...(req.body || {}),
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    if (result.mfa_required) {
      return res.status(202).json({
        message: "MFA verification required",
        mfa_required: true,
        challenge_token: result.challenge_token,
        challenge_expires_at: result.challenge_expires_at,
        user: result.user,
      });
    }

    setRefreshTokenCookie(res, result.refresh_token);
    return res.status(200).json(buildSessionResponseBody(result, "Login successful"));
  } catch (error) {
    return handleControllerError(res, "User login failed", error, {
      body: req.body && req.body.email ? { email: req.body.email } : {},
    });
  }
};

const refreshSession = async (req, res) => {
  try {
    const result = await authService.refreshSession({
      refresh_token: getRefreshTokenFromRequest(req),
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    setRefreshTokenCookie(res, result.refresh_token);
    return res.status(200).json(buildSessionResponseBody(result, "Token refreshed successfully"));
  } catch (error) {
    return handleControllerError(res, "Token refresh failed", error);
  }
};

const logoutUser = async (req, res) => {
  try {
    const result = await authService.logoutUser({
      refresh_token: getRefreshTokenFromRequest(req),
      actor: req.user || null,
      all_devices: Boolean(req.body && req.body.all_devices),
    });

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      message: result.logout_all
        ? "Logged out from all devices successfully"
        : "Logged out successfully",
    });
  } catch (error) {
    return handleControllerError(res, "Logout failed", error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body || {});

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, "Forgot password failed", error, {
      body: req.body && req.body.email ? { email: req.body.email } : {},
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body || {});

    clearRefreshTokenCookie(res);

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, "Reset password failed", error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyEmail({
      token: req.query && req.query.token,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, "Verify email failed", error);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyOtp({
      ...(req.body || {}),
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    setRefreshTokenCookie(res, result.refresh_token);
    return res.status(200).json(buildSessionResponseBody(result, "OTP verified successfully"));
  } catch (error) {
    return handleControllerError(res, "Verify OTP failed", error);
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.user_id || req.user.id);

    return res.status(200).json({
      user,
    });
  } catch (error) {
    return handleControllerError(res, "Fetching profile failed", error, {
      userId: req.user && (req.user.user_id || req.user.id),
    });
  }
};

const enableMfa = async (req, res) => {
  try {
    const result = await authService.updateMfaPreference({
      user_id: req.user && (req.user.user_id || req.user.id),
      password: req.body && req.body.password,
      enabled: true,
    });

    return res.status(200).json({
      message: "MFA enabled successfully",
      ...result,
    });
  } catch (error) {
    return handleControllerError(res, "Enable MFA failed", error);
  }
};

const disableMfa = async (req, res) => {
  try {
    const result = await authService.updateMfaPreference({
      user_id: req.user && (req.user.user_id || req.user.id),
      password: req.body && req.body.password,
      enabled: false,
    });

    return res.status(200).json({
      message: "MFA disabled successfully",
      ...result,
    });
  } catch (error) {
    return handleControllerError(res, "Disable MFA failed", error);
  }
};

module.exports = {
  disableMfa,
  enableMfa,
  forgotPassword,
  getUserProfile,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  resetPassword,
  verifyEmail,
  verifyOtp,
};
