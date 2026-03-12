const { pool } = require("../config/db");

const createNotificationForUser = async ({ userId, title, message, type }) => {
	const result = await pool.query(
		`
			INSERT INTO notifications (user_id, title, message, type, is_read, status)
			VALUES ($1, $2, $3, $4, FALSE, 'unread')
			RETURNING id, user_id, title, message, type, is_read, created_at
		`,
		[userId, title, message, type]
	);

	return result.rows[0];
};

const createNotificationForAllUsers = async ({ title, message, type }) => {
	const result = await pool.query(
		`
			INSERT INTO notifications (user_id, title, message, type, is_read, status)
			SELECT id, $1, $2, $3, FALSE, 'unread'
			FROM users
			RETURNING id, user_id, title, message, type, is_read, created_at
		`,
		[title, message, type]
	);

	return result.rows;
};

const getNotificationsByUserId = async (userId) => {
	const result = await pool.query(
		`
			SELECT id, user_id, title, message, type, is_read, created_at
			FROM notifications
			WHERE user_id = $1
			ORDER BY created_at DESC
		`,
		[userId]
	);

	return result.rows;
};

const markNotificationAsRead = async ({ notificationId, userId }) => {
	const result = await pool.query(
		`
			UPDATE notifications
			SET is_read = TRUE,
					status = 'read'
			WHERE id = $1 AND user_id = $2
			RETURNING id, user_id, title, message, type, is_read, created_at
		`,
		[notificationId, userId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createNotificationForAllUsers,
	createNotificationForUser,
	getNotificationsByUserId,
	markNotificationAsRead,
};