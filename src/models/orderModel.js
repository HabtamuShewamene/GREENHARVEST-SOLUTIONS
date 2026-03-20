const { pool } = require("../config/db");

const formatOrderRows = (rows) => {
	const ordersMap = new Map();

	rows.forEach((row) => {
		if (!ordersMap.has(row.order_id)) {
			ordersMap.set(row.order_id, {
				id: row.order_id,
				buyer_id: row.buyer_id,
				address_id: row.address_id,
				farmer_id: row.order_farmer_id,
				field_agent_id: row.field_agent_id,
				delivery_partner_id: row.delivery_partner_id,
				total_price: row.total_price,
				total_amount: row.total_amount,
				order_status: row.order_status,
				payment_status: row.payment_status,
				delivery_status: row.delivery_status,
				created_at: row.created_at,
				items: [],
			});
		}

		if (row.order_item_id) {
			ordersMap.get(row.order_id).items.push({
				id: row.order_item_id,
				product_id: row.product_id,
				quantity: row.quantity,
				price: row.price,
				product_name: row.product_name,
				image_url: row.image_url,
				farm_location: row.farm_location,
				farmer_id: row.farmer_id,
			});
		}
	});

	return Array.from(ordersMap.values());
};

const getOrdersForBuyer = async (buyer_id, order_id = null) => {
	const values = [buyer_id];
	let filter = "o.buyer_id = $1";

	if (order_id !== null) {
		values.push(order_id);
		filter += " AND o.order_id = $2";
	}

	const result = await pool.query(
		`
			SELECT
				o.order_id,
				o.buyer_id,
				o.address_id,
				o.farmer_id AS order_farmer_id,
				o.field_agent_id,
				o.delivery_partner_id,
				o.total_amount AS total_price,
				o.total_amount,
				o.order_status,
				COALESCE(pay.payment_status, 'pending') AS payment_status,
				COALESCE(d.delivery_status, 'pending') AS delivery_status,
				o.address_id,
				o.created_at,
				oi.order_item_id,
				oi.product_id,
				oi.quantity,
				oi.price,
				p.name AS product_name,
				pi.image_url,
				NULL::text AS farm_location,
				p.farmer_id
			FROM orders o
			LEFT JOIN order_items oi ON oi.order_id = o.order_id
			LEFT JOIN products p ON p.product_id = oi.product_id
			LEFT JOIN payments pay ON pay.order_id = o.order_id
			LEFT JOIN deliveries d ON d.order_id = o.order_id
			LEFT JOIN LATERAL (
				SELECT image_url
				FROM product_images
				WHERE product_id = p.product_id
				ORDER BY image_id ASC
				LIMIT 1
			) pi ON TRUE
			WHERE ${filter}
			ORDER BY o.created_at DESC, oi.order_item_id ASC
		`,
		values
	);

	return formatOrderRows(result.rows);
};

const findProductSupplyChainById = async (client, product_id) => {
	const result = await client.query(
		`
			SELECT
				p.product_id AS product_id,
				p.farmer_id,
				af.agent_id AS field_agent_id
			FROM products p
			LEFT JOIN agent_farmers af ON af.farmer_id = p.farmer_id
			WHERE p.product_id = $1
			ORDER BY af.id DESC NULLS LAST
			LIMIT 1
		`,
		[product_id]
	);

	return result.rows[0] || null;
};

const createOrderRecord = async (
	client,
	{ buyer_id, farmer_id, field_agent_id, delivery_partner_id = null, total_amount, address_id = null }
) => {
	const result = await client.query(
		`
			INSERT INTO orders (
				buyer_id,
				farmer_id,
				field_agent_id,
				delivery_partner_id,
				address_id,
				total_amount,
				order_status
			)
			VALUES ($1, $2, $3, $4, $5, $6, 'pending')
			RETURNING
				order_id AS id,
				buyer_id,
				farmer_id,
				field_agent_id,
				delivery_partner_id,
				address_id,
				total_amount AS total_price,
				total_amount,
				order_status,
				'pending'::varchar AS payment_status,
				'pending'::varchar AS delivery_status,
				created_at
		`,
		[buyer_id, farmer_id, field_agent_id, delivery_partner_id, address_id, total_amount]
	);

	return result.rows[0];
};

const createOrderItemRecord = async (client, { order_id, product_id, quantity, price }) => {
	const result = await client.query(
		`
			INSERT INTO order_items (order_id, product_id, quantity, price)
			VALUES ($1, $2, $3, $4)
			RETURNING order_item_id AS id, order_id, product_id, quantity, price
		`,
		[order_id, product_id, quantity, price]
	);

	return result.rows[0];
};

const decrementProductStock = async (client, product_id, quantity) => {
	const result = await client.query(
		`
			UPDATE inventory
			SET quantity = quantity - $1,
					last_updated = NOW()
			WHERE product_id = $2
			RETURNING product_id AS id, quantity AS stock
		`,
		[quantity, product_id]
	);

	return result.rows[0] || null;
};

const updateOrderStatusesById = async (
	order_id,
	{ order_status, payment_status, delivery_status }
) => {
	if (order_status !== null) {
		await pool.query(
			`UPDATE orders SET order_status = $1 WHERE order_id = $2`,
			[order_status, order_id]
		);
	}

	if (payment_status !== null) {
		await pool.query(
			`UPDATE payments SET payment_status = $1, paid_at = NOW() WHERE order_id = $2`,
			[payment_status, order_id]
		);
	}

	if (delivery_status !== null) {
		await pool.query(
			`UPDATE deliveries SET delivery_status = $1 WHERE order_id = $2`,
			[delivery_status, order_id]
		);
	}

	const result = await pool.query(
		`
			SELECT
				o.order_id AS id,
				o.buyer_id,
				o.total_amount AS total_price,
				o.total_amount,
				o.order_status,
				COALESCE(p.payment_status, 'pending') AS payment_status,
				COALESCE(d.delivery_status, 'pending') AS delivery_status,
				o.created_at
			FROM orders o
			LEFT JOIN payments p ON p.order_id = o.order_id
			LEFT JOIN deliveries d ON d.order_id = o.order_id
			WHERE o.order_id = $1
		`,
		[order_id]
	);

	return result.rows[0] || null;
};

module.exports = {
	createOrderItemRecord,
	createOrderRecord,
	decrementProductStock,
	findProductSupplyChainById,
	formatOrderRows,
	getOrdersForBuyer,
	updateOrderStatusesById,
};
