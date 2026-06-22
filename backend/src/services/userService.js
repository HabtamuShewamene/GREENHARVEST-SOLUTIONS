const userModel = require("../models/userModel");
const { normalizeRole } = require("../utils/roles");

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getMe = async (userId) => {
  const user = await userModel.findUserById(userId);

  if (!user) {
    throw createServiceError("User not found", 404);
  }

  return {
    ...user,
    role: normalizeRole(user.role_name || user.role),
  };
};

const updateProfile = async (userId, { name, phone, address, bio }) => {
  const updated = await userModel.updateUserProfile({ user_id: userId, name, phone, address, bio });

  if (!updated) {
    throw createServiceError("User not found", 404);
  }

  return updated;
};

const listUsers = async (actor) => {
  if (!actor || normalizeRole(actor.role) !== "admin") {
    throw createServiceError("Only admins can list users", 403);
  }

  const users = await userModel.findAllUsers();

  return users.map((user) => ({
    ...user,
    role: normalizeRole(user.role_name || user.role),
  }));
};

module.exports = {
  getMe,
  updateProfile,
  listUsers,
};
