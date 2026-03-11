// Product service that centralizes product business rules and persistence operations.
const { pool } = require("../config/db");
const logger = require("../utils/logger");
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
	const result = await pool.query("SELECT id, farmer_id FROM products WHERE id = $1", [
		productId,
	]);

	return result.rows[0] || null;
};

const getCategoryById = async (categoryId) => {
	const result = await pool.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
	return result.rows[0] || null;
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

	if (!isNonNegativeNumber(productValues.price)) {
		throw createServiceError("price must be a valid non-negative number", 400);
	}

	if (!Number.isInteger(productValues.stock) || productValues.stock < 0) {
		throw createServiceError("stock must be a non-negative integer", 400);
	}

	const categoryId = await validateCategoryId(payload.category_id);

	const result = await pool.query(
		`
			INSERT INTO products (
				farmer_id,
				category_id,
				name,
				description,
				price,
				stock,
				farm_location,
				image_url
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
		`,
		[
			user.id,
			categoryId,
			productValues.name,
			productValues.description || null,
			productValues.price,
			productValues.stock,
			productValues.farm_location || null,
			productValues.image_url || null,
		]
	);

	logger.info("Product created", { productId: result.rows[0].id, farmerId: user.id });
	return result.rows[0];
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

	if (productValues.price !== undefined && !isNonNegativeNumber(productValues.price)) {
		throw createServiceError("price must be a valid non-negative number", 400);
	}

	if (
		productValues.stock !== undefined &&
		(!Number.isInteger(productValues.stock) || productValues.stock < 0)
	) {
		throw createServiceError("stock must be a non-negative integer", 400);
	}

	const categoryId =
		payload.category_id === undefined ? undefined : await validateCategoryId(payload.category_id);

	const result = await pool.query(
		`
			UPDATE products
			SET
				name = COALESCE($1, name),
				description = COALESCE($2, description),
				price = COALESCE($3, price),
				stock = COALESCE($4, stock),
				category_id = COALESCE($5, category_id),
				farm_location = COALESCE($6, farm_location),
				image_url = COALESCE($7, image_url)
			WHERE id = $8
			RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
		`,
		[
			productValues.name !== undefined ? productValues.name : null,
			productValues.description !== undefined ? productValues.description : null,
			productValues.price !== undefined ? productValues.price : null,
			productValues.stock !== undefined ? productValues.stock : null,
			categoryId !== undefined ? categoryId : null,
			productValues.farm_location !== undefined ? productValues.farm_location : null,
			productValues.image_url !== undefined ? productValues.image_url : null,
			Number(productId),
		]
	);

	return result.rows[0];
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

	await pool.query("DELETE FROM products WHERE id = $1", [Number(productId)]);
	return { deleted: true };
};

const getAllProducts = async () => {
	const result = await pool.query(
		`
			SELECT
				p.id,
				p.name,
				p.description,
				p.price,
				p.stock,
				p.farm_location,
				p.image_url,
				p.created_at,
				p.category_id,
				p.farmer_id,
				u.name AS farmer_name,
				u.email AS farmer_email,
				c.name AS category_name
			FROM products p
			JOIN users u ON u.id = p.farmer_id
			LEFT JOIN categories c ON c.id = p.category_id
			ORDER BY p.created_at DESC
		`
	);

	return result.rows;
};

const getProductById = async (productId) => {
	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const result = await pool.query(
		`
			SELECT
				p.id,
				p.name,
				p.description,
				p.price,
				p.stock,
				p.farm_location,
				p.image_url,
				p.created_at,
				p.category_id,
				p.farmer_id,
				u.name AS farmer_name,
				u.email AS farmer_email,
				c.name AS category_name
			FROM products p
			JOIN users u ON u.id = p.farmer_id
			LEFT JOIN categories c ON c.id = p.category_id
			WHERE p.id = $1
		`,
		[Number(productId)]
	);

	if (result.rows.length === 0) {
		throw createServiceError("Product not found", 404);
	}

	return result.rows[0];
};

const updateProductStock = async ({ user, productId, stock }) => {
	ensureFarmerRole(user);

	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const parsedStock = Number(stock);

	if (!Number.isInteger(parsedStock) || parsedStock < 0) {
		throw createServiceError("stock must be a non-negative integer", 400);
	}

	const ownedProduct = await getProductOwnership(Number(productId));

	if (!ownedProduct) {
		throw createServiceError("Product not found", 404);
	}

	if (ownedProduct.farmer_id !== user.id) {
		throw createServiceError("You can only update stock for your own products", 403);
	}

	const result = await pool.query(
		`
			UPDATE products
			SET stock = $1
			WHERE id = $2
			RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
		`,
		[parsedStock, Number(productId)]
	);

	return result.rows[0];
};

module.exports = {
	createProduct,
	deleteProduct,
	getAllProducts,
	getProductById,
	updateProduct,
	updateProductStock,
};
