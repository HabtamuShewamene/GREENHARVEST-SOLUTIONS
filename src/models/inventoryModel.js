const { pool } = require("../config/db");

const upsertInventory = async ({ product_id, farmer_id, quantity }) => {
	const result = await pool.query(
		`
			INSERT INTO inventory (product_id, quantity, last_updated)
			VALUES ($1, $2, NOW())
			ON CONFLICT (product_id)
			DO UPDATE
			SET quantity = EXCLUDED.quantity,
					last_updated = NOW()
			RETURNING inventory_id AS id, product_id, quantity, last_updated
		`,
		[product_id, quantity]
	);

	return result.rows[0];
};

const getInventoryByProductId = async (product_id) => {
	const result = await pool.query(
		`
			SELECT
				i.inventory_id AS id,
				i.product_id,
				p.farmer_id,
				i.quantity,
				i.last_updated,
				p.name AS product_name,
				p.price AS product_price,
				u.name AS farmer_name
			FROM inventory i
			JOIN products p ON p.product_id = i.product_id
			JOIN users u ON u.user_id = p.farmer_id
			WHERE i.product_id = $1
		`,
		[product_id]
	);

	return result.rows[0] || null;
};

module.exports = {
	getInventoryByProductId,
	upsertInventory,
};