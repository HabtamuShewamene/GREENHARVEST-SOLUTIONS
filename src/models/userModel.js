const { pool } = require("../config/db");
const { normalizeRole } = require("../utils/roles");

const toDbRoleName = (role) => {
	const normalizedRole = normalizeRole(role);

	if (normalizedRole === "delivery_partner") {
		return "delivery_partner";
	}

	if (normalizedRole === "field_agent") {
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

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const insertedUser = await client.query(
			`
				INSERT INTO users (name, email, password_hash, role_id, phone)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING user_id, name, email, phone, created_at, role_id
			`,
			[name, email, password, roleRecord.role_id, phone]
		);

		const user = insertedUser.rows[0];

		if (roleName === "buyer") {
			await client.query(
				`INSERT INTO buyer_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[user.user_id]
			);
		} else if (roleName === "farmer") {
			await client.query(
				`INSERT INTO farmer_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[user.user_id]
			);
		} else if (roleName === "delivery_partner") {
			await client.query(
				`INSERT INTO delivery_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[user.user_id]
			);
		} else if (roleName === "field_agent") {
			await client.query(
				`INSERT INTO field_agent_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[user.user_id]
			);
		}

		await client.query("COMMIT");

		return {
			id: user.user_id,
			name: user.name,
			email: user.email,
			phone: user.phone,
			address: null,
			created_at: user.created_at,
			role_id: user.role_id,
			role_name: roleRecord.role_name,
			role: roleRecord.role_name,
		};
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
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
