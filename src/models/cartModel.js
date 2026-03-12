const { pool } = require("../config/db");

const ensureCartForUser = async (userId) => {
	const result = await pool.query(
		`
			INSERT INTO carts (user_id, updated_at)
			VALUES ($1, NOW())
			ON CONFLICT (user_id)
			DO UPDATE SET updated_at = NOW()
			RETURNING cart_id, user_id
		`,
		[userId]
	);

	return result.rows[0];
};

const getUserCartItems = async (userId) => {
	await ensureCartForUser(userId);

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
				p.image_url,
				p.farm_location,
				p.farmer_id,
				u.name AS farmer_name
			FROM carts c
			JOIN cart_items ci ON ci.cart_id = c.cart_id
			JOIN products p ON p.id = ci.product_id
			LEFT JOIN inventory i ON i.product_id = p.id
			JOIN users u ON u.id = p.farmer_id
			WHERE c.user_id = $1
			ORDER BY ci.cart_item_id DESC
		`,
		[userId]
	);

	return result.rows;
};

const findCartItemByUserAndProduct = async (userId, productId) => {
	await ensureCartForUser(userId);

	const result = await pool.query(
		`
			SELECT ci.cart_item_id AS id, ci.quantity
			FROM carts c
			JOIN cart_items ci ON ci.cart_id = c.cart_id
			WHERE c.user_id = $1 AND ci.product_id = $2
		`,
		[userId, productId]
	);

	return result.rows[0] || null;
};

const createCartItem = async ({ userId, productId, quantity }) => {
	const cart = await ensureCartForUser(userId);

	const result = await pool.query(
		`
			INSERT INTO cart_items (cart_id, product_id, quantity)
			VALUES ($1, $2, $3)
			RETURNING cart_item_id AS id, cart_id, product_id, quantity, created_at
		`,
		[cart.cart_id, productId, quantity]
	);

	await pool.query("UPDATE carts SET updated_at = NOW() WHERE cart_id = $1", [cart.cart_id]);

	return result.rows[0];
};

const findCartItemWithStockById = async (cartItemId) => {
	const result = await pool.query(
		`
			SELECT ci.cart_item_id AS id, c.user_id, ci.product_id, ci.quantity, COALESCE(i.quantity, 0) AS stock
			FROM cart_items ci
			JOIN carts c ON c.cart_id = ci.cart_id
			JOIN products p ON p.id = ci.product_id
			LEFT JOIN inventory i ON i.product_id = p.id
			WHERE ci.cart_item_id = $1
		`,
		[cartItemId]
	);

	return result.rows[0] || null;
};

const updateCartItemQuantityById = async (cartItemId, quantity) => {
	const result = await pool.query(
		`
			UPDATE cart_items
			SET quantity = $1
			WHERE cart_item_id = $2
			RETURNING cart_item_id AS id, cart_id, product_id, quantity, created_at
		`,
		[quantity, cartItemId]
	);

	if (result.rows[0]) {
		await pool.query(
			`
				UPDATE carts c
				SET updated_at = NOW()
				FROM cart_items ci
				WHERE ci.cart_item_id = $1 AND c.cart_id = ci.cart_id
			`,
			[cartItemId]
		);
	}

	return result.rows[0] || null;
};

const deleteCartItemByIdForUser = async (cartItemId, userId) => {
	const result = await pool.query(
		`
			DELETE FROM cart_items ci
			USING carts c
			WHERE ci.cart_item_id = $1
				AND ci.cart_id = c.cart_id
				AND c.user_id = $2
			RETURNING ci.cart_item_id AS id, c.cart_id
		`,
		[cartItemId, userId]
	);

	if (result.rows[0]) {
		await pool.query("UPDATE carts SET updated_at = NOW() WHERE cart_id = $1", [result.rows[0].cart_id]);
	}

	return result.rows[0] || null;
};

module.exports = {
	createCartItem,
	deleteCartItemByIdForUser,
	ensureCartForUser,
	findCartItemByUserAndProduct,
	findCartItemWithStockById,
	getUserCartItems,
	updateCartItemQuantityById,
};
