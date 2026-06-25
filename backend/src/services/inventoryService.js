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

const canManageFarmerInventory = async ({ actor, farmer_id }) => {
	const role = normalizeRole(actor.role);

	if (role === "admin") {
		return true;
	}

	if (role === "farmer") {
		return Number(actor.id) === Number(farmer_id);
	}



	return false;
};

const updateInventory = async ({ actor, payload }) => {
	const product_id = Number(payload.product_id);
	const quantity = Number(payload.quantity);

	if (!isPositiveInteger(product_id) || !Number.isInteger(quantity) || quantity < 0) {
		throw createServiceError("product_id and non-negative integer quantity are required", 400);
	}

	const ownership = await productModel.findProductOwnershipById(product_id);

	if (!ownership) {
		throw createServiceError("Product not found", 404);
	}

	const isAuthorized = await canManageFarmerInventory({
		actor,
		farmer_id: ownership.farmer_id,
	});

	if (!isAuthorized) {
		throw createServiceError("Forbidden: insufficient permissions", 403);
	}

	return inventoryModel.upsertInventory({
		product_id,
		farmer_id: ownership.farmer_id,
		quantity,
	});
};

const getInventoryByProductId = async (product_id, actor) => {
	if (!isPositiveInteger(product_id)) {
		throw createServiceError("Invalid product id", 400);
	}

	const ownership = await productModel.findProductOwnershipById(Number(product_id));

	if (!ownership) {
		throw createServiceError("Product not found", 404);
	}

	const role = normalizeRole(actor?.role);
	if (role !== "admin") {
		const isAuthorized = await canManageFarmerInventory({
			actor,
			farmer_id: ownership.farmer_id,
		});

		if (!isAuthorized) {
			throw createServiceError("Forbidden: insufficient permissions", 403);
		}
	}

	const inventory = await inventoryModel.getInventoryByProductId(Number(product_id));

	if (!inventory) {
		throw createServiceError("Inventory not found for this product", 404);
	}

	return inventory;
};

module.exports = {
	getInventoryByProductId,
	updateInventory,
};
