// Product service that centralizes product business rules and persistence operations.
const logger = require("../utils/logger");
const categoryModel = require("../models/categoryModel");
const inventoryModel = require("../models/inventoryModel");
const productModel = require("../models/productModel");
const {
	getMissingRequiredFields,
	isNonNegativeNumber,
	isPositiveInteger,
} = require("../utils/validators");

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const ensureFarmerRole = (user) => {
	if (!user || user.role !== "farmer") {
		throw createServiceError("Only farmers can perform this action", 403);
	}
};

const getProductOwnership = async (productId) => {
	return productModel.findProductOwnershipById(productId);
};

const getCategoryById = async (categoryId) => {
	return categoryModel.findCategoryById(categoryId);
};

const validateCategoryId = async (categoryId) => {
	if (categoryId === null || categoryId === undefined) {
		return null;
	}

	if (!Number.isInteger(Number(categoryId))) {
		throw createServiceError("category_id must be an integer", 400);
	}

	const parsedCategoryId = Number(categoryId);
	const category = await getCategoryById(parsedCategoryId);

	if (!category) {
		throw createServiceError("Invalid category_id. Referenced category does not exist", 400);
	}

	return parsedCategoryId;
};

const buildProductValues = (payload = {}) => {
	return {
		name: payload.name !== undefined ? String(payload.name).trim() : undefined,
		description:
			payload.description !== undefined
				? payload.description
					? String(payload.description).trim()
					: null
				: undefined,
		price: payload.price !== undefined ? Number(payload.price) : undefined,
		stock: payload.stock !== undefined ? Number(payload.stock) : undefined,
		farm_location:
			payload.farm_location !== undefined
				? payload.farm_location
					? String(payload.farm_location).trim()
					: null
				: undefined,
		image_url:
			payload.image_url !== undefined
				? payload.image_url
					? String(payload.image_url).trim()
					: null
				: undefined,
	};
};

const createProduct = async ({ user, payload }) => {
	ensureFarmerRole(user);

	const missingFields = getMissingRequiredFields(payload, ["name", "price", "stock"]);

	if (missingFields.length > 0) {
		throw createServiceError("Name, valid price, and integer stock are required", 400);
	}

	const productValues = buildProductValues(payload);

	if (!isNonNegativeNumber(productValues.price) || Number(productValues.price) <= 0) {
		throw createServiceError("price must be a valid number greater than 0", 400);
	}

	if (!Number.isInteger(productValues.stock) || productValues.stock <= 0) {
		throw createServiceError("stock must be a positive integer", 400);
	}

	const categoryId = await validateCategoryId(payload.category_id);

	const product = await productModel.createProduct({
		farmerId: user.id,
		categoryId,
		name: productValues.name,
		description: productValues.description || null,
		price: productValues.price,
		farmLocation: productValues.farm_location || null,
		imageUrl: productValues.image_url || null,
	});

	await inventoryModel.upsertInventory({
		productId: product.id,
		farmerId: user.id,
		quantity: productValues.stock,
	});

	logger.info("Product created", { productId: product.id, farmerId: user.id });
	return productModel.findProductById(product.id);
};

const updateProduct = async ({ user, productId, payload }) => {
	ensureFarmerRole(user);

	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const ownedProduct = await getProductOwnership(Number(productId));

	if (!ownedProduct) {
		throw createServiceError("Product not found", 404);
	}

	if (ownedProduct.farmer_id !== user.id) {
		throw createServiceError("You can only update your own products", 403);
	}

	const hasUpdateField = [
		"name",
		"description",
		"price",
		"stock",
		"category_id",
		"farm_location",
		"image_url",
	].some((field) => payload[field] !== undefined);

	if (!hasUpdateField) {
		throw createServiceError("At least one field is required for update", 400);
	}

	const productValues = buildProductValues(payload);

	if (
		productValues.price !== undefined &&
		(!isNonNegativeNumber(productValues.price) || Number(productValues.price) <= 0)
	) {
		throw createServiceError("price must be a valid number greater than 0", 400);
	}

	if (
		productValues.stock !== undefined &&
		(!Number.isInteger(productValues.stock) || productValues.stock < 0)
	) {
		throw createServiceError("stock must be a non-negative integer", 400);
	}

	const categoryId =
		payload.category_id === undefined ? undefined : await validateCategoryId(payload.category_id);

	const updatedProduct = await productModel.updateProductById(Number(productId), {
		name: productValues.name !== undefined ? productValues.name : null,
		description: productValues.description !== undefined ? productValues.description : null,
		price: productValues.price !== undefined ? productValues.price : null,
		categoryId: categoryId !== undefined ? categoryId : null,
		farmLocation:
			productValues.farm_location !== undefined ? productValues.farm_location : null,
		imageUrl: productValues.image_url !== undefined ? productValues.image_url : null,
	});

	if (productValues.stock !== undefined) {
		await inventoryModel.upsertInventory({
			productId: updatedProduct.id,
			farmerId: user.id,
			quantity: productValues.stock,
		});

		return productModel.findProductById(updatedProduct.id);
	}

	return productModel.findProductById(updatedProduct.id);
};

const deleteProduct = async ({ user, productId }) => {
	ensureFarmerRole(user);

	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const ownedProduct = await getProductOwnership(Number(productId));

	if (!ownedProduct) {
		throw createServiceError("Product not found", 404);
	}

	if (ownedProduct.farmer_id !== user.id) {
		throw createServiceError("You can only delete your own products", 403);
	}

	await productModel.deleteProductById(Number(productId));
	return { deleted: true };
};

const getAllProducts = async () => {
	return productModel.findAllProducts();
};

const getProductById = async (productId) => {
	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const product = await productModel.findProductById(Number(productId));

	if (!product) {
		throw createServiceError("Product not found", 404);
	}

	return product;
};

const updateProductStock = async ({ user, productId, stock }) => {
	ensureFarmerRole(user);

	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const parsedStock = Number(stock);

	if (!Number.isInteger(parsedStock) || parsedStock <= 0) {
		throw createServiceError("stock must be a positive integer", 400);
	}

	const ownedProduct = await getProductOwnership(Number(productId));

	if (!ownedProduct) {
		throw createServiceError("Product not found", 404);
	}

	if (ownedProduct.farmer_id !== user.id) {
		throw createServiceError("You can only update stock for your own products", 403);
	}

	await inventoryModel.upsertInventory({
		productId: Number(productId),
		farmerId: user.id,
		quantity: parsedStock,
	});

	return productModel.findProductById(Number(productId));
};

module.exports = {
	createProduct,
	deleteProduct,
	getAllProducts,
	getProductById,
	updateProduct,
	updateProductStock,
};
