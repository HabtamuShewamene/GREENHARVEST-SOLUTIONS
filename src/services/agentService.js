const agentModel = require("../models/agentModel");
const categoryModel = require("../models/categoryModel");
const inventoryModel = require("../models/inventoryModel");
const productModel = require("../models/productModel");
const { pool } = require("../config/db");
const { normalizeRole } = require("../utils/roles");
const { isNonNegativeNumber, isPositiveInteger } = require("../utils/validators");

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const ensureRole = (user, roles) => {
	if (!user || !roles.includes(normalizeRole(user.role))) {
		throw createServiceError("Forbidden: insufficient permissions", 403);
	}
};

const ensureUserWithRole = async (user_id, role) => {
	const user = await agentModel.findUserById(user_id);

	if (!user) {
		throw createServiceError("User not found", 404);
	}

	if (normalizeRole(user.role) !== role) {
		throw createServiceError(`User must have role ${role}`, 400);
	}

	return user;
};

const assignFarmer = async ({ actor, agent_id, farmer_id }) => {
	ensureRole(actor, ["admin"]);

	if (!isPositiveInteger(agent_id) || !isPositiveInteger(farmer_id)) {
		throw createServiceError("agent_id and farmer_id must be valid integers", 400);
	}

	await ensureUserWithRole(Number(agent_id), "fieldAgent");
	await ensureUserWithRole(Number(farmer_id), "farmer");

	return agentModel.assignFarmer({
		agent_id: Number(agent_id),
		farmer_id: Number(farmer_id),
		assigned_by: actor.id,
	});
};

const getFarmers = async ({ actor, agent_id }) => {
	ensureRole(actor, ["admin", "fieldAgent"]);

	const actorRole = normalizeRole(actor.role);
	const actorUserId = Number(actor && actor.user_id ? actor.user_id : actor && actor.id);
	const selected_agent_id =
		actorRole === "admin"
			? (agent_id ? Number(agent_id) : null)
			: actorUserId;

	if (selected_agent_id !== null && !isPositiveInteger(selected_agent_id)) {
		throw createServiceError("agent_id must be a valid integer", 400);
	}

	if (selected_agent_id === null) {
		throw createServiceError("agent_id query parameter is required for admins", 400);
	}

	if (actorRole === "admin") {
		await ensureUserWithRole(selected_agent_id, "fieldAgent");
	}

	return agentModel.getFarmersByAgent(selected_agent_id);
};

const addProductForFarmer = async ({ actor, payload }) => {
	ensureRole(actor, ["admin", "fieldAgent"]);

	const farmer_id = Number(payload.farmer_id);

	if (!isPositiveInteger(farmer_id)) {
		throw createServiceError("farmer_id is required and must be a valid integer", 400);
	}

	await ensureUserWithRole(farmer_id, "farmer");

	const farmerProfileResult = await pool.query(
		`SELECT farmer_id FROM farmer_profiles WHERE user_id = $1 LIMIT 1`,
		[farmer_id]
	);

	const farmer_profile_id = farmerProfileResult.rows[0] && farmerProfileResult.rows[0].farmer_id;

	if (!farmer_profile_id) {
		throw createServiceError("Farmer profile not found", 404);
	}

	if (normalizeRole(actor.role) === "fieldAgent") {
		const actorAgentUserId = Number(actor && actor.user_id ? actor.user_id : actor && actor.id);
		const isAssigned = await agentModel.isAgentAssignedToFarmer({
			agent_id: actorAgentUserId,
			farmer_id,
		});

		if (!isAssigned) {
			throw createServiceError("Field agent is not assigned to this farmer", 403);
		}
	}

	if (
		!payload.name ||
		!isNonNegativeNumber(payload.price) ||
		Number(payload.price) <= 0 ||
		!Number.isInteger(Number(payload.stock)) ||
		Number(payload.stock) <= 0
	) {
		throw createServiceError("name, price, and stock are required with valid values", 400);
	}

	let category_id = null;

	if (payload.category_id !== undefined && payload.category_id !== null) {
		if (!isPositiveInteger(payload.category_id)) {
			throw createServiceError("category_id must be a valid integer", 400);
		}

		const category = await categoryModel.findCategoryById(Number(payload.category_id));

		if (!category) {
			throw createServiceError("Invalid category_id. Referenced category does not exist", 400);
		}

		category_id = Number(payload.category_id);
	}

	const product = await productModel.createProduct({
		farmer_id: Number(farmer_profile_id),
		category_id,
		name: String(payload.name).trim(),
		description: payload.description ? String(payload.description).trim() : null,
		price: Number(payload.price),
		farm_location: payload.farm_location ? String(payload.farm_location).trim() : null,
		image_url: payload.image_url ? String(payload.image_url).trim() : null,
	});

	await inventoryModel.upsertInventory({
		product_id: product.id,
		farmer_id: Number(farmer_profile_id),
		quantity: Number(payload.stock),
	});

	return productModel.findProductById(product.id);
};

module.exports = {
	addProductForFarmer,
	assignFarmer,
	getFarmers,
};