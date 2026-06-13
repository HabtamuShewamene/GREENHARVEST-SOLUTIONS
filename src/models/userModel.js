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

const baseUserSelect = `
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
		COALESCE(r.role_name, 'buyer') AS role,
		COALESCE(u.is_verified, FALSE) AS is_verified,
		COALESCE(u.mfa_enabled, FALSE) AS mfa_enabled,
		u.backup_email,
		u.recovery_phone,
		u.verification_token_hash,
		u.verification_token_expiry,
		u.password_reset_token_hash,
		u.password_reset_token_expiry,
		u.last_login_at
	FROM users u
	LEFT JOIN roles r ON r.role_id = u.role_id
`;

const createUser = async ({
	name,
	email,
	password,
	role,
	phone = null,
	address = null,
	backup_email = null,
	recovery_phone = null,
}) => {
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
				INSERT INTO users (
					name,
					email,
					password,
					role,
					role_id,
					phone,
					address,
					is_verified,
					mfa_enabled,
					backup_email,
					recovery_phone
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, $8, $9)
				RETURNING
					id,
					name,
					email,
					phone,
					address,
					created_at,
					role_id,
					is_verified,
					mfa_enabled,
					backup_email,
					recovery_phone
			`,
			[name, email, password, roleName, roleRecord.role_id, phone, address, backup_email, recovery_phone]
		);

		const user = insertedUser.rows[0];
		const userId = user.id;

		if (roleName === "buyer") {
			await client.query(
				`INSERT INTO buyer_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[userId]
			);
		} else if (roleName === "farmer") {
			await client.query(
				`INSERT INTO farmer_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[userId]
			);
		} else if (roleName === "delivery_partner") {
			await client.query(
				`INSERT INTO delivery_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[userId]
			);
		} else if (roleName === "field_agent") {
			await client.query(
				`INSERT INTO field_agent_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[userId]
			);
		}

		await client.query("COMMIT");

		return {
			id: userId,
			name: user.name,
			email: user.email,
			phone: user.phone,
			address: user.address,
			created_at: user.created_at,
			role_id: user.role_id,
			role_name: roleRecord.role_name,
			role: roleRecord.role_name,
			is_verified: user.is_verified,
			mfa_enabled: user.mfa_enabled,
			backup_email: user.backup_email,
			recovery_phone: user.recovery_phone,
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
			${baseUserSelect}
			WHERE u.email = $1
		`,
		[email]
	);

	return result.rows[0] || null;
};

const findUserById = async (userId) => {
	const result = await pool.query(
		`
			${baseUserSelect}
			WHERE u.id = $1
		`,
		[userId]
	);

	if (!result.rows[0]) {
		return null;
	}

	const { password, verification_token_hash, password_reset_token_hash, ...safeUser } = result.rows[0];
	return safeUser;
};

const findAllUsers = async () => {
	const result = await pool.query(
		`
			${baseUserSelect}
			ORDER BY u.id DESC
		`
	);

	return result.rows.map((row) => {
		const { password, verification_token_hash, password_reset_token_hash, ...safeUser } = row;
		return safeUser;
	});
};

const findUserByIdWithPassword = async (userId) => {
	const result = await pool.query(
		`
			${baseUserSelect}
			WHERE u.id = $1
		`,
		[userId]
	);

	return result.rows[0] || null;
};

const updateLastLoginAt = async (userId) => {
	await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
};

const storeEmailVerificationToken = async ({ user_id, token_hash, expires_at }) => {
	await pool.query(
		`
			UPDATE users
			SET
				verification_token_hash = $1,
				verification_token_expiry = $2
			WHERE id = $3
		`,
		[token_hash, expires_at, user_id]
	);
};

const findUserByVerificationToken = async (token_hash) => {
	const result = await pool.query(
		`
			${baseUserSelect}
			WHERE u.verification_token_hash = $1
		`,
		[token_hash]
	);

	return result.rows[0] || null;
};

const markEmailVerified = async (userId) => {
	const result = await pool.query(
		`
			UPDATE users
			SET
				is_verified = TRUE,
				verification_token_hash = NULL,
				verification_token_expiry = NULL
			WHERE id = $1
			RETURNING id, is_verified
		`,
		[userId]
	);

	return result.rows[0] || null;
};

const storePasswordResetToken = async ({ user_id, token_hash, expires_at }) => {
	await pool.query(
		`
			UPDATE users
			SET
				password_reset_token_hash = $1,
				password_reset_token_expiry = $2
			WHERE id = $3
		`,
		[token_hash, expires_at, user_id]
	);
};

const findUserByPasswordResetToken = async (token_hash) => {
	const result = await pool.query(
		`
			${baseUserSelect}
			WHERE u.password_reset_token_hash = $1
		`,
		[token_hash]
	);

	return result.rows[0] || null;
};

const clearPasswordResetToken = async (userId) => {
	await pool.query(
		`
			UPDATE users
			SET
				password_reset_token_hash = NULL,
				password_reset_token_expiry = NULL
			WHERE id = $1
		`,
		[userId]
	);
};

const updateUserPassword = async ({ user_id, password_hash }) => {
	await pool.query(
		`
			UPDATE users
			SET password = $1
			WHERE id = $2
		`,
		[password_hash, user_id]
	);
};

const updateMfaPreference = async ({ user_id, enabled }) => {
	const result = await pool.query(
		`
			UPDATE users
			SET mfa_enabled = $1
			WHERE id = $2
			RETURNING id, mfa_enabled
		`,
		[enabled, user_id]
	);

	return result.rows[0] || null;
};

module.exports = {
	clearPasswordResetToken,
	createUser,
	findAllUsers,
	findUserByEmail,
	findUserById,
	findUserByIdWithPassword,
	findUserByPasswordResetToken,
	findUserByVerificationToken,
	markEmailVerified,
	storeEmailVerificationToken,
	storePasswordResetToken,
	updateLastLoginAt,
	updateMfaPreference,
	updateUserPassword,
};
