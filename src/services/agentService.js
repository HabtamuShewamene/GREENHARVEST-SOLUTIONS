const agentModel = require("../models/agentModel");
const categoryModel = require("../models/categoryModel");
const inventoryModel = require("../models/inventoryModel");
const productModel = require("../models/productModel");
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

const ensureUserWithRole = async (userId, role) => {
	const user = await agentModel.findUserById(userId);

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
		agentId: Number(agent_id),
		farmerId: Number(farmer_id),
		assignedBy: actor.id,
	});
};

const getFarmers = async ({ actor, agent_id }) => {
	ensureRole(actor, ["admin", "fieldAgent"]);

	const selectedAgentId =
		normalizeRole(actor.role) === "admin"
			? (agent_id ? Number(agent_id) : null)
			: Number(actor.id);

	if (selectedAgentId !== null && !isPositiveInteger(selectedAgentId)) {
		throw createServiceError("agent_id must be a valid integer", 400);
	}

	if (selectedAgentId === null) {
		throw createServiceError("agent_id query parameter is required for admins", 400);
	}

	await ensureUserWithRole(selectedAgentId, "fieldAgent");
	return agentModel.getFarmersByAgent(selectedAgentId);
};

const addProductForFarmer = async ({ actor, payload }) => {
	ensureRole(actor, ["admin", "fieldAgent"]);

	const farmerId = Number(payload.farmer_id);

	if (!isPositiveInteger(farmerId)) {
		throw createServiceError("farmer_id is required and must be a valid integer", 400);
	}

	await ensureUserWithRole(farmerId, "farmer");

	if (normalizeRole(actor.role) === "fieldAgent") {
		const isAssigned = await agentModel.isAgentAssignedToFarmer({
			agentId: actor.id,
			farmerId,
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

	let categoryId = null;

	if (payload.category_id !== undefined && payload.category_id !== null) {
		if (!isPositiveInteger(payload.category_id)) {
			throw createServiceError("category_id must be a valid integer", 400);
		}

		const category = await categoryModel.findCategoryById(Number(payload.category_id));

		if (!category) {
			throw createServiceError("Invalid category_id. Referenced category does not exist", 400);
		}

		categoryId = Number(payload.category_id);
	}

	const product = await productModel.createProduct({
		farmerId,
		categoryId,
		name: String(payload.name).trim(),
		description: payload.description ? String(payload.description).trim() : null,
		price: Number(payload.price),
		farmLocation: payload.farm_location ? String(payload.farm_location).trim() : null,
		imageUrl: payload.image_url ? String(payload.image_url).trim() : null,
	});

	await inventoryModel.upsertInventory({
		productId: product.id,
		farmerId,
		quantity: Number(payload.stock),
	});

	return productModel.findProductById(product.id);
};

module.exports = {
	addProductForFarmer,
	assignFarmer,
	getFarmers,
};