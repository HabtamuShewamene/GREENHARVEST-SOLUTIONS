const { pool } = require("../config/db");

const productSelect = `
	SELECT
		p.product_id AS id,
		p.name,
		p.description,
		p.price,
		COALESCE(i.quantity, 0) AS stock,
		NULL::text AS farm_location,
		pi.image_url,
		p.created_at,
		p.category_id,
		p.farmer_id,
		u.name AS farmer_name,
		u.email AS farmer_email,
		c.category_name
	FROM products p
	JOIN users u ON u.user_id = p.farmer_id
	LEFT JOIN categories c ON c.category_id = p.category_id
	LEFT JOIN inventory i ON i.product_id = p.product_id
	LEFT JOIN LATERAL (
		SELECT image_url
		FROM product_images
		WHERE product_id = p.product_id
		ORDER BY image_id ASC
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
				price
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING product_id AS id, farmer_id, category_id, name, description, price, created_at
		`,
		[farmer_id, category_id, name, description, price]
	);

	if (image_url) {
		await pool.query(
			`
				INSERT INTO product_images (product_id, image_url)
				VALUES ($1, $2)
			`,
			[result.rows[0].id, image_url]
		);
	}

	return result.rows[0];
};

const findProductOwnershipById = async (productId) => {
	const result = await pool.query("SELECT product_id AS id, farmer_id FROM products WHERE product_id = $1", [productId]);
	return result.rows[0] || null;
};

const findProductStockById = async (productId) => {
	const result = await pool.query(
		`
			SELECT p.product_id AS id, p.farmer_id, COALESCE(i.quantity, 0) AS stock
			FROM products p
			LEFT JOIN inventory i ON i.product_id = p.product_id
			WHERE p.product_id = $1
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const findProductStockForUpdateById = async (client, productId) => {
	const result = await client.query(
		`
			SELECT p.product_id AS id, p.farmer_id, COALESCE(i.quantity, 0) AS stock
			FROM products p
			LEFT JOIN inventory i ON i.product_id = p.product_id
			WHERE p.product_id = $1
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
			WHERE p.product_id = $1
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
				category_id = COALESCE($4, category_id)
			WHERE product_id = $5
			RETURNING product_id AS id, farmer_id, category_id, name, description, price, created_at
		`,
		[name, description, price, category_id, productId]
	);

	if (image_url !== undefined && image_url !== null) {
		const imageResult = await pool.query(
			`SELECT image_id FROM product_images WHERE product_id = $1 ORDER BY image_id ASC LIMIT 1`,
			[productId]
		);

		if (imageResult.rows[0]) {
			await pool.query(
				`UPDATE product_images SET image_url = $1 WHERE image_id = $2`,
				[image_url, imageResult.rows[0].image_id]
			);
		} else {
			await pool.query(
				`INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`,
				[productId, image_url]
			);
		}
	}

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
			WHERE product_id = $1
			RETURNING product_id AS id
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
