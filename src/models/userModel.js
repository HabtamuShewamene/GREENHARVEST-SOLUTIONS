const { pool } = require("../config/db");
const { normalizeRole } = require("../utils/roles");

const createUser = async ({ name, email, password, role, phone = null, address = null }) => {
	const normalizedRole = normalizeRole(role);

	const roleResult = await pool.query(
		`
			SELECT role_id, role_name
			FROM roles
			WHERE role_name = CASE
				WHEN $1 = 'deliveryPartner' THEN 'delivery_partner'
				WHEN $1 = 'fieldAgent' THEN 'field_agent'
				ELSE LOWER($1)
			END
		`,
		[normalizedRole]
	);

	if (roleResult.rows.length === 0) {
		throw new Error("Invalid role mapping");
	}

	const roleRecord = roleResult.rows[0];

	const result = await pool.query(
		`
			INSERT INTO users (name, email, password, role_id, role, phone, address)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, name, email, role, role_id, phone, address, created_at
		`,
		[name, email, password, roleRecord.role_id, roleRecord.role_name, phone, address]
	);

	return result.rows[0];
};

const findUserByEmail = async (email) => {
	const result = await pool.query(
		`
			SELECT
				u.id,
				u.name,
				u.email,
				u.password,
				u.phone,
				u.address,
				u.created_at,
				u.role_id,
				r.role_name,
				COALESCE(u.role, r.role_name) AS role
			FROM users u
			JOIN roles r ON r.role_id = u.role_id
			WHERE u.email = $1
		`,
		[email]
	);

	return result.rows[0] || null;
};

const findUserById = async (userId) => {
	const result = await pool.query(
		`
			SELECT
				u.id,
				u.name,
				u.email,
				u.phone,
				u.address,
				u.created_at,
				u.role_id,
				r.role_name,
				COALESCE(u.role, r.role_name) AS role
			FROM users u
			JOIN roles r ON r.role_id = u.role_id
			WHERE u.id = $1
		`,
		[userId]
	);

	return result.rows[0] || null;
};

const findAllUsers = async () => {
	const result = await pool.query(
		`
			SELECT
				u.id,
				u.name,
				u.email,
				u.phone,
				u.address,
				u.created_at,
				u.role_id,
				r.role_name,
				COALESCE(u.role, r.role_name) AS role
			FROM users u
			JOIN roles r ON r.role_id = u.role_id
			ORDER BY u.created_at DESC
		`
	);

	return result.rows;
};

module.exports = {
	createUser,
	findAllUsers,
	findUserByEmail,
	findUserById,
};
