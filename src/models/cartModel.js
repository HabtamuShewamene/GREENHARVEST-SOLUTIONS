const { pool } = require("../config/db");

const getUserCartItems = async (userId) => {
	const result = await pool.query(
		`
			SELECT
				c.id,
				c.user_id,
				c.product_id,
				c.quantity,
				p.name AS product_name,
				p.description AS product_description,
				p.price AS product_price,
				p.stock AS product_stock,
				p.image_url,
				p.farm_location,
				p.farmer_id,
				u.name AS farmer_name
			FROM cart c
			JOIN products p ON p.id = c.product_id
			JOIN users u ON u.id = p.farmer_id
			WHERE c.user_id = $1
			ORDER BY c.id DESC
		`,
		[userId]
	);

	return result.rows;
};

const findCartItemByUserAndProduct = async (userId, productId) => {
	const result = await pool.query(
		`
			SELECT id, quantity
			FROM cart
			WHERE user_id = $1 AND product_id = $2
		`,
		[userId, productId]
	);

	return result.rows[0] || null;
};

const createCartItem = async ({ userId, productId, quantity }) => {
	const result = await pool.query(
		`
			INSERT INTO cart (user_id, product_id, quantity)
			VALUES ($1, $2, $3)
			RETURNING id, user_id, product_id, quantity, created_at
		`,
		[userId, productId, quantity]
	);

	return result.rows[0];
};

const findCartItemWithStockById = async (cartItemId) => {
	const result = await pool.query(
		`
			SELECT c.id, c.user_id, c.product_id, c.quantity, p.stock
			FROM cart c
			JOIN products p ON p.id = c.product_id
			WHERE c.id = $1
		`,
		[cartItemId]
	);

	return result.rows[0] || null;
};

const updateCartItemQuantityById = async (cartItemId, quantity) => {
	const result = await pool.query(
		`
			UPDATE cart
			SET quantity = $1
			WHERE id = $2
			RETURNING id, user_id, product_id, quantity, created_at
		`,
		[quantity, cartItemId]
	);

	return result.rows[0] || null;
};

const deleteCartItemByIdForUser = async (cartItemId, userId) => {
	const result = await pool.query(
		`
			DELETE FROM cart
			WHERE id = $1 AND user_id = $2
			RETURNING id
		`,
		[cartItemId, userId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createCartItem,
	deleteCartItemByIdForUser,
	findCartItemByUserAndProduct,
	findCartItemWithStockById,
	getUserCartItems,
	updateCartItemQuantityById,
};
