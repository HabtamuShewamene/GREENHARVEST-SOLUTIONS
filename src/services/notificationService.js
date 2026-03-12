const notificationModel = require("../models/notificationModel");
const agentModel = require("../models/agentModel");
const { normalizeRole } = require("../utils/roles");
const { isPositiveInteger } = require("../utils/validators");

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const createNotification = async ({ actor, payload }) => {
	if (normalizeRole(actor.role) !== "admin") {
		throw createServiceError("Only admins can create notifications", 403);
	}

	const message = payload.message ? String(payload.message).trim() : "";

	if (!message) {
		throw createServiceError("message is required", 400);
	}

	const title = payload.title ? String(payload.title).trim() : "Notification";
	const type = payload.type ? String(payload.type).trim() : "general";

	if (payload.user_id !== undefined && payload.user_id !== null) {
		const userId = Number(payload.user_id);

		if (!isPositiveInteger(userId)) {
			throw createServiceError("user_id must be a valid integer", 400);
		}

		const user = await agentModel.findUserById(userId);

		if (!user) {
			throw createServiceError("User not found", 404);
		}

		const notification = await notificationModel.createNotificationForUser({
			userId,
			title,
			message,
			type,
		});

		return {
			count: 1,
			notifications: [notification],
		};
	}

	const notifications = await notificationModel.createNotificationForAllUsers({
		title,
		message,
		type,
	});

	return {
		count: notifications.length,
		notifications,
	};
};

const getNotifications = async (userId) => {
	return notificationModel.getNotificationsByUserId(userId);
};

const markAsRead = async ({ userId, notificationId }) => {
	if (!isPositiveInteger(notificationId)) {
		throw createServiceError("Invalid notification id", 400);
	}

	const notification = await notificationModel.markNotificationAsRead({
		notificationId: Number(notificationId),
		userId,
	});

	if (!notification) {
		throw createServiceError("Notification not found", 404);
	}

	return notification;
};

module.exports = {
	createNotification,
	getNotifications,
	markAsRead,
};