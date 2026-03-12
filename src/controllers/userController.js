const logger = require("../utils/logger");
const userService = require("../services/userService");

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

const getMe = async (req, res) => {
  try {
    const user = await userService.getMe(req.user.id);

    return res.status(200).json({ user });
  } catch (error) {
    return handleControllerError(res, "Get current user failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await userService.listUsers(req.user);

    return res.status(200).json({ users });
  } catch (error) {
    return handleControllerError(res, "List users failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

module.exports = {
  getMe,
  listUsers,
};
