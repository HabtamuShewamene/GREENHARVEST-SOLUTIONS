const { pool } = require("../config/db");

const productSelect = `
	SELECT
		p.id,
		p.name,
		p.description,
		p.price,
		COALESCE(i.quantity, 0) AS stock,
		p.farm_location,
		COALESCE(pi.image_url, p.image_url) AS image_url,
		p.created_at,
		p.category_id,
		p.farmer_id,
		u.name AS farmer_name,
		u.email AS farmer_email,
		c.name AS category_name
	FROM products p
	JOIN users u ON u.id = p.farmer_id
	LEFT JOIN categories c ON c.id = p.category_id
	LEFT JOIN inventory i ON i.product_id = p.id
	LEFT JOIN LATERAL (
		SELECT image_url
		FROM product_images
		WHERE product_id = p.id
		ORDER BY is_primary DESC, image_id ASC
		LIMIT 1
	) pi ON TRUE
`;

const createProduct = async ({
	farmer_id,
	category_id,
	name,
	description,
	price,
	farm_location,
	image_url,
}) => {
	const result = await pool.query(
		`
			INSERT INTO products (
				farmer_id,
				category_id,
				name,
				description,
				price,
				farm_location,
				image_url
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, farmer_id, category_id, name, description, price, farm_location, image_url, created_at
		`,
		[farmer_id, category_id, name, description, price, farm_location, image_url]
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
			SELECT p.id, p.farmer_id, COALESCE(i.quantity, 0) AS stock
			FROM products p
			LEFT JOIN inventory i ON i.product_id = p.id
			WHERE p.id = $1
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const findProductStockForUpdateById = async (client, productId) => {
	const result = await client.query(
		`
			SELECT p.id, p.farmer_id, COALESCE(i.quantity, 0) AS stock
			FROM products p
			LEFT JOIN inventory i ON i.product_id = p.id
			WHERE p.id = $1
			FOR UPDATE
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
	{ name, description, price, category_id, farm_location, image_url }
) => {
	const result = await pool.query(
		`
			UPDATE products
			SET
				name = COALESCE($1, name),
				description = COALESCE($2, description),
				price = COALESCE($3, price),
				category_id = COALESCE($4, category_id),
				farm_location = COALESCE($5, farm_location),
				image_url = COALESCE($6, image_url)
			WHERE id = $7
			RETURNING id, farmer_id, category_id, name, description, price, farm_location, image_url, created_at
		`,
		[name, description, price, category_id, farm_location, image_url, productId]
	);

	return result.rows[0] || null;
};

const updateProductStockById = async (productId, stock) => {
	await pool.query(
		`
			UPDATE inventory
			SET quantity = $1,
					last_updated = NOW()
			WHERE product_id = $2
		`,
		[stock, productId]
	);

	return findProductById(productId);
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
	findProductStockForUpdateById,
	updateProductById,
	updateProductStockById,
};
