const { pool } = require("../config/db");
const { normalizeRole } = require("../utils/roles");

const createUser = async ({ name, email, password, role, phone = null, address = null }) => {
	const normalizedRole = normalizeRole(role);

	const result = await pool.query(
		`
			INSERT INTO users (name, email, password, role, phone, address)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, name, email, role, phone, address, created_at
		`,
		[name, email, password, normalizedRole, phone, address]
	);

	return result.rows[0];
};

const findUserByEmail = async (email) => {
	const result = await pool.query(
		`
			SELECT id, name, email, password, role, phone, address, created_at
			FROM users
			WHERE email = $1
		`,
		[email]
	);

	return result.rows[0] || null;
};

const findUserById = async (userId) => {
	const result = await pool.query(
		`
			SELECT id, name, email, role, phone, address, created_at
			FROM users
			WHERE id = $1
		`,
		[userId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createUser,
	findUserByEmail,
	findUserById,
};
