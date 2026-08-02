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
    const user = await userService.getMe(req.user.user_id || req.user.id);

    return res.status(200).json({ user });
  } catch (error) {
    return handleControllerError(res, "Get current user failed", error, {
      userId: req.user && (req.user.user_id || req.user.id),
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    const { name, phone, address, bio } = req.body;

    const updated = await userService.updateProfile(userId, { name, phone, address, bio });

    return res.status(200).json({ user: updated, message: 'Profile updated successfully' });
  } catch (error) {
    return handleControllerError(res, "Update profile failed", error, {
      userId: req.user && (req.user.user_id || req.user.id),
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

const getFarmerProfile = async (req, res) => {
  try {
    const user = await userService.getMe(req.params.id);
    if (user.role !== 'farmer') {
      return res.status(404).json({ message: "Farmer not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return handleControllerError(res, "Get farmer profile failed", error, {
      userId: req.params.id,
    });
  }
};

module.exports = {
  getMe,
  updateMe,
  listUsers,
  getFarmerProfile,
};
