const { pool } = require("../config/db");

const upsertInventory = async ({ product_id, farmer_id, quantity }) => {
	const result = await pool.query(
		`
			INSERT INTO inventory (product_id, farmer_id, quantity, last_updated)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (product_id)
			DO UPDATE
			SET quantity = EXCLUDED.quantity,
					farmer_id = EXCLUDED.farmer_id,
					last_updated = NOW()
			RETURNING id, product_id, farmer_id, quantity, last_updated
		`,
		[product_id, farmer_id, quantity]
	);

	return result.rows[0];
};

const getInventoryByProductId = async (product_id) => {
	const result = await pool.query(
		`
			SELECT
				i.id,
				i.product_id,
				i.farmer_id,
				i.quantity,
				i.last_updated,
				p.name AS product_name,
				p.price AS product_price,
				u.name AS farmer_name
			FROM inventory i
			JOIN products p ON p.id = i.product_id
			JOIN users u ON u.id = i.farmer_id
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