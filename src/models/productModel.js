const { pool } = require("../config/db");

const productSelect = `
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
`;

const createProduct = async ({
	farmerId,
	categoryId,
	name,
	description,
	price,
	stock,
	farmLocation,
	imageUrl,
}) => {
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
		[farmerId, categoryId, name, description, price, stock, farmLocation, imageUrl]
	);

	return result.rows[0];
};

const findProductOwnershipById = async (productId) => {
	const result = await pool.query("SELECT id, farmer_id FROM products WHERE id = $1", [productId]);
	return result.rows[0] || null;
};

const findProductStockById = async (productId) => {
	const result = await pool.query(
		`
			SELECT id, stock
			FROM products
			WHERE id = $1
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const findAllProducts = async () => {
	const result = await pool.query(
		`
			${productSelect}
			ORDER BY p.created_at DESC
		`
	);

	return result.rows;
};

const findProductById = async (productId) => {
	const result = await pool.query(
		`
			${productSelect}
			WHERE p.id = $1
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const updateProductById = async (
	productId,
	{ name, description, price, stock, categoryId, farmLocation, imageUrl }
) => {
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
		[name, description, price, stock, categoryId, farmLocation, imageUrl, productId]
	);

	return result.rows[0] || null;
};

const updateProductStockById = async (productId, stock) => {
	const result = await pool.query(
		`
			UPDATE products
			SET stock = $1
			WHERE id = $2
			RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
		`,
		[stock, productId]
	);

	return result.rows[0] || null;
};

const deleteProductById = async (productId) => {
	const result = await pool.query(
		`
			DELETE FROM products
			WHERE id = $1
			RETURNING id
		`,
		[productId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createProduct,
	deleteProductById,
	findAllProducts,
	findProductById,
	findProductOwnershipById,
	findProductStockById,
	updateProductById,
	updateProductStockById,
};
