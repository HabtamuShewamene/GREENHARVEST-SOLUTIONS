const { pool } = require("../config/db");
const { normalizeRole } = require("../utils/roles");

const tableColumnsCache = new Map();
const tableExistsCache = new Map();

const tableExists = async (tableName, db = pool) => {
	const cached = tableExistsCache.get(tableName);
	if (cached !== undefined) {
		return cached;
	}

	const result = await db.query(
		`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = CURRENT_SCHEMA()
					AND table_name = $1
			) AS exists
		`,
		[tableName]
	);

	const exists = Boolean(result.rows[0] && result.rows[0].exists);
	tableExistsCache.set(tableName, exists);
	return exists;
};

const getTableColumns = async (tableName, db = pool) => {
	const cached = tableColumnsCache.get(tableName);
	if (cached) {
		return cached;
	}

	const result = await db.query(
		`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = CURRENT_SCHEMA()
				AND table_name = $1
		`,
		[tableName]
	);

	const columns = result.rows.map((row) => row.column_name);
	tableColumnsCache.set(tableName, columns);
	return columns;
};

const getFirstAvailableColumn = (columns, candidateColumns) => (
	candidateColumns.find((columnName) => columns.includes(columnName)) || null
);

const nullableColumn = (columns, columnName, fallbackType = "text") => (
	columns.includes(columnName) ? `u.${columnName}` : `NULL::${fallbackType}`
);

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

const buildUserSelect = async (db = pool) => {
	const userColumns = await getTableColumns("users", db);
	const userIdColumn = getFirstAvailableColumn(userColumns, ["id", "user_id"]);
	const passwordColumn = getFirstAvailableColumn(userColumns, ["password", "password_hash"]);
	const hasRoleJoin = userColumns.includes("role_id") && (await tableExists("roles", db));
	const hasUserBio = userColumns.includes("bio");
	const hasFarmerProfileBio =
		!hasUserBio &&
		(await tableExists("farmer_profiles", db)) &&
		(await getTableColumns("farmer_profiles", db)).includes("user_id") &&
		(await getTableColumns("farmer_profiles", db)).includes("bio");
	const roleValue = userColumns.includes("role")
		? "u.role"
		: "NULL::text";
	const roleNameValue = hasRoleJoin
		? "r.role_name"
		: "NULL::text";

	return {
		userIdColumn,
		passwordColumn,
		sql: `
			SELECT
				u.${userIdColumn} AS id,
				u.name,
				u.email,
				${passwordColumn ? `u.${passwordColumn}` : "NULL::text"} AS password,
				${nullableColumn(userColumns, "phone")} AS phone,
				${nullableColumn(userColumns, "address")} AS address,
				${hasUserBio ? "u.bio" : (hasFarmerProfileBio ? "fp.bio" : "NULL::text")} AS bio,
				${nullableColumn(userColumns, "created_at", "timestamptz")} AS created_at,
				${nullableColumn(userColumns, "role_id", "integer")} AS role_id,
				${roleNameValue} AS role_name,
				COALESCE(${roleNameValue}, ${roleValue}, 'buyer') AS role,
				COALESCE(${nullableColumn(userColumns, "is_verified", "boolean")}, FALSE) AS is_verified,
				COALESCE(${nullableColumn(userColumns, "mfa_enabled", "boolean")}, FALSE) AS mfa_enabled,
				${nullableColumn(userColumns, "backup_email")} AS backup_email,
				${nullableColumn(userColumns, "recovery_phone")} AS recovery_phone,
				${nullableColumn(userColumns, "verification_token_hash")} AS verification_token_hash,
				${nullableColumn(userColumns, "verification_token_expiry", "timestamptz")} AS verification_token_expiry,
				${nullableColumn(userColumns, "password_reset_token_hash")} AS password_reset_token_hash,
				${nullableColumn(userColumns, "password_reset_token_expiry", "timestamptz")} AS password_reset_token_expiry,
				${nullableColumn(userColumns, "last_login_at", "timestamptz")} AS last_login_at
			FROM users u
			${hasRoleJoin ? "LEFT JOIN roles r ON r.role_id = u.role_id" : ""}
			${hasFarmerProfileBio ? `LEFT JOIN farmer_profiles fp ON fp.user_id = u.${userIdColumn}` : ""}
		`,
		userColumns,
	};
};

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
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			${userSelect.sql}
			WHERE u.email = $1
		`,
		[email]
	);

	return result.rows[0] || null;
};

const findUserById = async (userId) => {
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			${userSelect.sql}
			WHERE u.${userSelect.userIdColumn} = $1
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
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			${userSelect.sql}
			ORDER BY u.${userSelect.userIdColumn} DESC
		`
	);

	return result.rows.map((row) => {
		const { password, verification_token_hash, password_reset_token_hash, ...safeUser } = row;
		return safeUser;
	});
};

const findUserByIdWithPassword = async (userId) => {
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			${userSelect.sql}
			WHERE u.${userSelect.userIdColumn} = $1
		`,
		[userId]
	);

	return result.rows[0] || null;
};

const updateLastLoginAt = async (userId) => {
	const userSelect = await buildUserSelect();
	await pool.query(`UPDATE users SET last_login_at = NOW() WHERE ${userSelect.userIdColumn} = $1`, [userId]);
};

const storeEmailVerificationToken = async ({ user_id, token_hash, expires_at }) => {
	const userSelect = await buildUserSelect();
	await pool.query(
		`
			UPDATE users
			SET
				verification_token_hash = $1,
				verification_token_expiry = $2
			WHERE ${userSelect.userIdColumn} = $3
		`,
		[token_hash, expires_at, user_id]
	);
};

const findUserByVerificationToken = async (token_hash) => {
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			${userSelect.sql}
			WHERE u.verification_token_hash = $1
		`,
		[token_hash]
	);

	return result.rows[0] || null;
};

const markEmailVerified = async (userId) => {
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			UPDATE users
			SET
				is_verified = TRUE,
				verification_token_hash = NULL,
				verification_token_expiry = NULL
			WHERE ${userSelect.userIdColumn} = $1
			RETURNING ${userSelect.userIdColumn} AS id, is_verified
		`,
		[userId]
	);

	return result.rows[0] || null;
};

const storePasswordResetToken = async ({ user_id, token_hash, expires_at }) => {
	const userSelect = await buildUserSelect();
	await pool.query(
		`
			UPDATE users
			SET
				password_reset_token_hash = $1,
				password_reset_token_expiry = $2
			WHERE ${userSelect.userIdColumn} = $3
		`,
		[token_hash, expires_at, user_id]
	);
};

const findUserByPasswordResetToken = async (token_hash) => {
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			${userSelect.sql}
			WHERE u.password_reset_token_hash = $1
		`,
		[token_hash]
	);

	return result.rows[0] || null;
};

const clearPasswordResetToken = async (userId) => {
	const userSelect = await buildUserSelect();
	await pool.query(
		`
			UPDATE users
			SET
				password_reset_token_hash = NULL,
				password_reset_token_expiry = NULL
			WHERE ${userSelect.userIdColumn} = $1
		`,
		[userId]
	);
};

const updateUserProfile = async ({ user_id, name, phone, address, bio }) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		const userSelect = await buildUserSelect(client);
		const profileColumns = (await tableExists("farmer_profiles", client))
			? await getTableColumns("farmer_profiles", client)
			: [];
		const updatableUserFields = [
			{ column: "name", value: name },
			{ column: "phone", value: phone },
			{ column: "address", value: address },
			{ column: "bio", value: bio },
		].filter(({ column }) => userSelect.userColumns.includes(column));
		const setClauses = updatableUserFields.map(({ column }, index) => `${column} = COALESCE($${index + 1}, ${column})`);
		const values = updatableUserFields.map(({ value }) => value ?? null);
		values.push(user_id);

		const result = await client.query(
			`
				UPDATE users
				SET
					${setClauses.join(",\n\t\t\t\t\t")}
				WHERE ${userSelect.userIdColumn} = $${values.length}
				RETURNING ${userSelect.userIdColumn} AS id
			`,
			values
		);

		if (!result.rows[0]) {
			await client.query("ROLLBACK");
			return null;
		}

		if (bio !== undefined && profileColumns.includes("user_id") && profileColumns.includes("bio")) {
			await client.query(
				`
					INSERT INTO farmer_profiles (user_id, bio)
					SELECT u.${userSelect.userIdColumn}, $2
					FROM users u
					${userSelect.userColumns.includes("role_id") ? "LEFT JOIN roles r ON r.role_id = u.role_id" : ""}
					WHERE u.${userSelect.userIdColumn} = $1
						AND COALESCE(${userSelect.userColumns.includes("role_id") ? "r.role_name" : "NULL::text"}, ${userSelect.userColumns.includes("role") ? "u.role" : "NULL::text"}) = 'farmer'
					ON CONFLICT (user_id)
					DO UPDATE SET bio = EXCLUDED.bio
				`,
				[user_id, bio ?? null]
			);
		}

		const updated = await client.query(
			`
				${userSelect.sql}
				WHERE u.${userSelect.userIdColumn} = $1
			`,
			[user_id]
		);

		await client.query("COMMIT");

		if (!updated.rows[0]) {
			return null;
		}

		const { password, verification_token_hash, password_reset_token_hash, ...safeUser } = updated.rows[0];
		return safeUser;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const updateUserPassword = async ({ user_id, password_hash }) => {
	const userSelect = await buildUserSelect();
	await pool.query(
		`
			UPDATE users
			SET ${userSelect.passwordColumn} = $1
			WHERE ${userSelect.userIdColumn} = $2
		`,
		[password_hash, user_id]
	);
};

const updateMfaPreference = async ({ user_id, enabled }) => {
	const userSelect = await buildUserSelect();
	const result = await pool.query(
		`
			UPDATE users
			SET mfa_enabled = $1
			WHERE ${userSelect.userIdColumn} = $2
			RETURNING ${userSelect.userIdColumn} AS id, mfa_enabled
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
	updateUserProfile,
};
