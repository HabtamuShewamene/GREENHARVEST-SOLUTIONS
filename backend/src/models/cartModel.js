const { pool } = require("../config/db");

const ensureCartForUser = async (user_id) => {
	const existing = await pool.query(
		`SELECT cart_id, user_id FROM carts WHERE user_id = $1 ORDER BY cart_id ASC LIMIT 1`,
		[user_id]
	);

	if (existing.rows[0]) {
		return existing.rows[0];
	}

	const inserted = await pool.query(
		`
			INSERT INTO carts (user_id)
			VALUES ($1)
			RETURNING cart_id, user_id
		`,
		[user_id]
	);

	return inserted.rows[0];
};

const getUserCartItems = async (user_id) => {
	await ensureCartForUser(user_id);

	const result = await pool.query(
		`
			SELECT
				ci.cart_item_id AS id,
				c.user_id,
				ci.product_id,
				ci.quantity,
				p.name AS product_name,
				p.description AS product_description,
				p.price AS product_price,
				COALESCE(i.quantity, 0) AS product_stock,
				pi.image_url,
				NULL::text AS farm_location,
				p.farmer_id,
				u.name AS farmer_name
			FROM carts c
			JOIN cart_items ci ON ci.cart_id = c.cart_id
			JOIN products p ON p.id = ci.product_id
			LEFT JOIN inventory i ON i.product_id = p.id
			LEFT JOIN LATERAL (
				SELECT image_url
				FROM product_images
				WHERE product_id = p.id
				ORDER BY image_id ASC
				LIMIT 1
			) pi ON TRUE
			JOIN users u ON u.id = p.farmer_id
			WHERE c.user_id = $1
			ORDER BY ci.cart_item_id DESC
		`,
		[user_id]
	);

	return result.rows;
};

const findCartItemByUserAndProduct = async (user_id, product_id) => {
	await ensureCartForUser(user_id);

	const result = await pool.query(
		`
			SELECT ci.cart_item_id AS id, ci.quantity
			FROM carts c
			JOIN cart_items ci ON ci.cart_id = c.cart_id
			WHERE c.user_id = $1 AND ci.product_id = $2
		`,
		[user_id, product_id]
	);

	return result.rows[0] || null;
};

const createCartItem = async ({ user_id, product_id, quantity }) => {
	const cart = await ensureCartForUser(user_id);

	const result = await pool.query(
		`
			INSERT INTO cart_items (cart_id, product_id, quantity)
			VALUES ($1, $2, $3)
			RETURNING cart_item_id AS id, cart_id, product_id, quantity
		`,
		[cart.cart_id, product_id, quantity]
	);

	return result.rows[0];
};

const findCartItemWithStockById = async (cart_item_id) => {
	const result = await pool.query(
		`
			SELECT ci.cart_item_id AS id, c.user_id, ci.product_id, ci.quantity, COALESCE(i.quantity, 0) AS stock
			FROM cart_items ci
			JOIN carts c ON c.cart_id = ci.cart_id
			JOIN products p ON p.id = ci.product_id
			LEFT JOIN inventory i ON i.product_id = p.id
			WHERE ci.cart_item_id = $1
		`,
		[cart_item_id]
	);

	return result.rows[0] || null;
};

const updateCartItemQuantityById = async (cart_item_id, quantity) => {
	const result = await pool.query(
		`
			UPDATE cart_items
			SET quantity = $1
			WHERE cart_item_id = $2
			RETURNING cart_item_id AS id, cart_id, product_id, quantity
		`,
		[quantity, cart_item_id]
	);

	return result.rows[0] || null;
};

const deleteCartItemByIdForUser = async (cart_item_id, user_id) => {
	const result = await pool.query(
		`
			DELETE FROM cart_items ci
			USING carts c
			WHERE ci.cart_item_id = $1
				AND ci.cart_id = c.cart_id
				AND c.user_id = $2
			RETURNING ci.cart_item_id AS id, c.cart_id
		`,
		[cart_item_id, user_id]
	);

	return result.rows[0] || null;
};

const clearCartItemsForUser = async (user_id) => {
	const result = await pool.query(
		`
			DELETE FROM cart_items ci
			USING carts c
			WHERE ci.cart_id = c.cart_id
				AND c.user_id = $1
			RETURNING ci.cart_item_id AS id, c.cart_id
		`,
		[user_id]
	);

	return result.rows;
};

module.exports = {
	createCartItem,
	deleteCartItemByIdForUser,
	ensureCartForUser,
	findCartItemByUserAndProduct,
	findCartItemWithStockById,
	getUserCartItems,
	updateCartItemQuantityById,
	clearCartItemsForUser,
};
