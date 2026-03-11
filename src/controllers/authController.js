// Auth controller delegates business logic to the auth service.
const logger = require("../utils/logger");
const authService = require("../services/authService");

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

const registerUser = async (req, res) => {
  try {
    await authService.registerUser(req.body || {});

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    return handleControllerError(res, "User registration failed", error, {
      body: req.body,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { token, user } = await authService.loginUser(req.body || {});

    return res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    return handleControllerError(res, "User login failed", error, {
      body: req.body && req.body.email ? { email: req.body.email } : {},
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);

    return res.status(200).json({
      user,
    });
  } catch (error) {
    return handleControllerError(res, "Fetching profile failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
