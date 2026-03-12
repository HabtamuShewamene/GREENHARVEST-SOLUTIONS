const agentModel = require("../models/agentModel");
const inventoryModel = require("../models/inventoryModel");
const productModel = require("../models/productModel");
const { normalizeRole } = require("../utils/roles");
const { isPositiveInteger } = require("../utils/validators");

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const canManageFarmerInventory = async ({ actor, farmerId }) => {
	const role = normalizeRole(actor.role);

	if (role === "admin") {
		return true;
	}

	if (role === "farmer") {
		return Number(actor.id) === Number(farmerId);
	}

	if (role === "fieldAgent") {
		return agentModel.isAgentAssignedToFarmer({
			agentId: actor.id,
			farmerId,
		});
	}

	return false;
};

const updateInventory = async ({ actor, payload }) => {
	const productId = Number(payload.product_id);
	const quantity = Number(payload.quantity);

	if (!isPositiveInteger(productId) || !Number.isInteger(quantity) || quantity < 0) {
		throw createServiceError("product_id and non-negative integer quantity are required", 400);
	}

	const ownership = await productModel.findProductOwnershipById(productId);

	if (!ownership) {
		throw createServiceError("Product not found", 404);
	}

	const isAuthorized = await canManageFarmerInventory({
		actor,
		farmerId: ownership.farmer_id,
	});

	if (!isAuthorized) {
		throw createServiceError("Forbidden: insufficient permissions", 403);
	}

	await productModel.updateProductStockById(productId, quantity);

	return inventoryModel.upsertInventory({
		productId,
		farmerId: ownership.farmer_id,
		quantity,
	});
};

const getInventoryByProductId = async (productId) => {
	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const inventory = await inventoryModel.getInventoryByProductId(Number(productId));

	if (!inventory) {
		throw createServiceError("Inventory not found for this product", 404);
	}

	return inventory;
};

module.exports = {
	getInventoryByProductId,
	updateInventory,
};