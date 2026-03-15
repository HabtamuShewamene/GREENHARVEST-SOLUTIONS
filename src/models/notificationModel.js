const { pool } = require("../config/db");

const createNotificationForUser = async ({ user_id, title, message, type }) => {
	const result = await pool.query(
		`
			INSERT INTO notifications (user_id, title, message, is_read, created_at)
			VALUES ($1, $2, $3, FALSE, NOW())
			RETURNING notification_id AS id, user_id, title, message, $4::text AS type, is_read, created_at
		`,
		[user_id, title, message, type]
	);

	return result.rows[0];
};

const createNotificationForAllUsers = async ({ title, message, type }) => {
	const result = await pool.query(
		`
			INSERT INTO notifications (user_id, title, message, is_read, created_at)
			SELECT user_id, $1, $2, FALSE, NOW()
			FROM users
			RETURNING notification_id AS id, user_id, title, message, $3::text AS type, is_read, created_at
		`,
		[title, message, type]
	);

	return result.rows;
};

const getNotificationsByUserId = async (user_id) => {
	const result = await pool.query(
		`
			SELECT notification_id AS id, user_id, title, message, 'general'::text AS type, is_read, created_at
			FROM notifications
			WHERE user_id = $1
			ORDER BY created_at DESC
		`,
		[user_id]
	);

	return result.rows;
};

const markNotificationAsRead = async ({ notification_id, user_id }) => {
	const result = await pool.query(
		`
			UPDATE notifications
			SET is_read = TRUE
			WHERE notification_id = $1 AND user_id = $2
			RETURNING notification_id AS id, user_id, title, message, 'general'::text AS type, is_read, created_at
		`,
		[notification_id, user_id]
	);

	return result.rows[0] || null;
};

module.exports = {
	createNotificationForAllUsers,
	createNotificationForUser,
	getNotificationsByUserId,
	markNotificationAsRead,
};