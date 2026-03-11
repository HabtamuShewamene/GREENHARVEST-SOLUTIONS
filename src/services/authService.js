// Authentication service that centralizes registration, login, and token generation.
const bcrypt = require("bcrypt");

const { pool } = require("../config/db");
const { signToken } = require("../utils/jwt");
const logger = require("../utils/logger");
const {
	getMissingRequiredFields,
	isStrongPassword,
	isValidEmail,
} = require("../utils/validators");

const allowedRoles = ["buyer", "farmer", "admin", "delivery"];

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const buildUserPayload = (user) => {
	return {
		id: user.id,
		email: user.email,
		role: user.role,
	};
};

const generateToken = (user) => {
	return signToken(buildUserPayload(user), { expiresIn: "7d" });
};

const registerUser = async ({ name, email, password, role }) => {
	const missingFields = getMissingRequiredFields(
		{ name, email, password, role },
		["name", "email", "password", "role"]
	);

	if (missingFields.length > 0) {
		throw createServiceError(
			`${missingFields.join(", ")} ${missingFields.length > 1 ? "are" : "is"} required`,
			400
		);
	}

	const normalizedEmail = email.trim().toLowerCase();
	const normalizedRole = role.trim().toLowerCase();

	if (!isValidEmail(normalizedEmail)) {
		throw createServiceError("A valid email address is required", 400);
	}

	if (!allowedRoles.includes(normalizedRole)) {
		throw createServiceError("Invalid role provided", 400);
	}

	if (!isStrongPassword(password)) {
		throw createServiceError(
			"Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
			400
		);
	}

	const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [
		normalizedEmail,
	]);

	if (existingUser.rows.length > 0) {
		throw createServiceError("User already exists with this email", 409);
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const result = await pool.query(
		`
			INSERT INTO users (name, email, password, role)
			VALUES ($1, $2, $3, $4)
			RETURNING id, name, email, role, phone, address, created_at
		`,
		[name.trim(), normalizedEmail, hashedPassword, normalizedRole]
	);

	logger.info("User registered successfully", {
		userId: result.rows[0].id,
		role: result.rows[0].role,
	});

	return result.rows[0];
};

const loginUser = async ({ email, password }) => {
	const missingFields = getMissingRequiredFields({ email, password }, ["email", "password"]);

	if (missingFields.length > 0) {
		throw createServiceError("Email and password are required", 400);
	}

	const normalizedEmail = email.trim().toLowerCase();

	if (!isValidEmail(normalizedEmail)) {
		throw createServiceError("A valid email address is required", 400);
	}

	const result = await pool.query(
		`
			SELECT id, name, email, password, role, phone, address, created_at
			FROM users
			WHERE email = $1
		`,
		[normalizedEmail]
	);

	if (result.rows.length === 0) {
		throw createServiceError("Invalid credentials", 401);
	}

	const user = result.rows[0];
	const isPasswordValid = await bcrypt.compare(password, user.password);

	if (!isPasswordValid) {
		throw createServiceError("Invalid credentials", 401);
	}

	return {
		token: generateToken(user),
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			phone: user.phone,
			address: user.address,
			created_at: user.created_at,
		},
	};
};

const getUserProfile = async (userId) => {
	const result = await pool.query(
		`
			SELECT id, name, email, role, phone, address, created_at
			FROM users
			WHERE id = $1
		`,
		[userId]
	);

	if (result.rows.length === 0) {
		throw createServiceError("User not found", 404);
	}

	return result.rows[0];
};

module.exports = {
	allowedRoles,
	generateToken,
	getUserProfile,
	loginUser,
	registerUser,
};
