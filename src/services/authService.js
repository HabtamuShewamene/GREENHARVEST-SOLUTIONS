// Authentication service that centralizes registration, login, and token generation.
const bcrypt = require("bcrypt");

const userModel = require("../models/userModel");
const { signToken } = require("../utils/jwt");
const logger = require("../utils/logger");
const { ALLOWED_ROLES, normalizeRole } = require("../utils/roles");
const {
	getMissingRequiredFields,
	isStrongPassword,
	isValidEmail,
} = require("../utils/validators");

const allowedRoles = ALLOWED_ROLES;

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
		role: normalizeRole(user.role_name || user.role),
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
	const normalizedRole = normalizeRole(role);

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

	const existingUser = await userModel.findUserByEmail(normalizedEmail);

	if (existingUser) {
		throw createServiceError("User already exists with this email", 409);
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const user = await userModel.createUser({
		name: name.trim(),
		email: normalizedEmail,
		password: hashedPassword,
		role: normalizedRole,
	});

	logger.info("User registered successfully", {
		userId: user.id,
		role: user.role,
	});

	return user;
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

	const user = await userModel.findUserByEmail(normalizedEmail);

	if (!user) {
		throw createServiceError("Invalid credentials", 401);
	}

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
			role: normalizeRole(user.role_name || user.role),
			role_name: user.role_name || user.role,
			phone: user.phone,
			address: user.address,
			created_at: user.created_at,
		},
	};
};

const getUserProfile = async (userId) => {
	const user = await userModel.findUserById(userId);

	if (!user) {
		throw createServiceError("User not found", 404);
	}

	return user;
};

module.exports = {
	allowedRoles,
	generateToken,
	getUserProfile,
	loginUser,
	registerUser,
};
