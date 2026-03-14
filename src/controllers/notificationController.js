const logger = require("../utils/logger");
const notificationService = require("../services/notificationService");

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

const createNotification = async (req, res) => {
	try {
		const result = await notificationService.createNotification({
			actor: req.user,
			payload: req.body || {},
		});

		if (result.count === 1) {
			return res.status(201).json({
				message: "Notification created successfully",
				notification: result.notifications[0],
			});
		}

		return res.status(201).json({
			message: "Notifications created successfully",
			count: result.count,
			notifications: result.notifications,
		});
	} catch (error) {
		return handleControllerError(res, "Create notification failed", error, {
			userId: req.user && req.user.id,
			body: req.body,
		});
	}
};

const getUserNotifications = async (req, res) => {
	try {
		const notifications = await notificationService.getNotifications(req.user.id);

		return res.status(200).json({
			notifications,
		});
	} catch (error) {
		return handleControllerError(res, "Fetch notifications failed", error, {
			userId: req.user && req.user.id,
		});
	}
};

const markNotificationAsRead = async (req, res) => {
	try {
		const notification = await notificationService.markAsRead({
			user_id: req.user.id,
			notification_id: req.params.id,
		});

		return res.status(200).json({
			message: "Notification marked as read",
			notification,
		});
	} catch (error) {
		return handleControllerError(res, "Mark notification as read failed", error, {
			userId: req.user && req.user.id,
			notificationId: req.params.id,
		});
	}
};

module.exports = {
	createNotification,
	getUserNotifications,
	markNotificationAsRead,
};
