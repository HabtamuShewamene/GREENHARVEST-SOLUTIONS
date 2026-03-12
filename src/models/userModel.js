const { pool } = require("../config/db");
const { normalizeRole } = require("../utils/roles");

const toDbRoleName = (role) => {
	const normalizedRole = normalizeRole(role);

	if (normalizedRole === "deliveryPartner") {
		return "delivery_partner";
	}

	if (normalizedRole === "fieldAgent") {
		return "field_agent";
	}

	return normalizedRole;
};

const createUser = async ({ name, email, password, role, phone = null, address = null }) => {
	const roleName = toDbRoleName(role);

	const roleResult = await pool.query(
		`
			SELECT role_id, role_name
			FROM roles
			WHERE role_name = $1
		`,
		[roleName]
	);

	if (roleResult.rows.length === 0) {
		throw new Error(`Role '${roleName}' is not configured`);
	}

	const roleRecord = roleResult.rows[0];

	const result = await pool.query(
		`
			WITH inserted AS (
				INSERT INTO users (name, email, password_hash, role_id, phone)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING user_id, name, email, phone, created_at, role_id
			)
			SELECT
				i.user_id AS id,
				i.name,
				i.email,
				i.phone,
				NULL::text AS address,
				i.created_at,
				i.role_id,
				r.role_name,
				r.role_name AS role
			FROM inserted i
			LEFT JOIN roles r ON r.role_id = i.role_id
		`,
		[name, email, password, roleRecord.role_id, phone]
	);

	return result.rows[0];
};

const findUserByEmail = async (email) => {
	const result = await pool.query(
		`
			SELECT
				u.user_id AS id,
				u.name,
				u.email,
				u.password_hash AS password,
				u.phone,
				NULL::text AS address,
				u.created_at,
				u.role_id,
				r.role_name,
				COALESCE(r.role_name, 'buyer') AS role
			FROM users u
			LEFT JOIN roles r ON r.role_id = u.role_id
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
				u.user_id AS id,
				u.name,
				u.email,
				u.phone,
				NULL::text AS address,
				u.created_at,
				u.role_id,
				r.role_name,
				COALESCE(r.role_name, 'buyer') AS role
			FROM users u
			LEFT JOIN roles r ON r.role_id = u.role_id
			WHERE u.user_id = $1
		`,
		[userId]
	);

	return result.rows[0] || null;
};

const findAllUsers = async () => {
	const result = await pool.query(
		`
			SELECT
				u.user_id AS id,
				u.name,
				u.email,
				u.phone,
				NULL::text AS address,
				u.created_at,
				u.role_id,
				r.role_name,
				COALESCE(r.role_name, 'buyer') AS role
			FROM users u
			LEFT JOIN roles r ON r.role_id = u.role_id
			ORDER BY u.user_id DESC
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
