const { pool } = require("../config/db");

const formatOrderRows = (rows) => {
	const ordersMap = new Map();

	rows.forEach((row) => {
		if (!ordersMap.has(row.order_id)) {
			ordersMap.set(row.order_id, {
				id: row.order_id,
				buyer_id: row.buyer_id,
				address_id: row.address_id,
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
	let filter = "o.id IS NOT NULL AND o.buyer_id = $1";

	if (order_id !== null) {
		values.push(order_id);
		filter += " AND o.id = $2";
	}

	const result = await pool.query(
		`
			SELECT
				o.id AS order_id,
				o.buyer_id,
				o.address_id,
				o.total_price,
				o.total_amount,
				o.order_status,
				o.payment_status,
				o.delivery_status,
				o.created_at,
				oi.id AS order_item_id,
				oi.product_id,
				oi.quantity,
				oi.price,
				p.name AS product_name,
				COALESCE(p.image_url, pi.image_url) AS image_url,
				p.farm_location,
				p.farmer_id
			FROM orders o
			LEFT JOIN order_items oi ON oi.order_id = o.id
			LEFT JOIN products p ON p.id = oi.product_id
			LEFT JOIN LATERAL (
				SELECT image_url
				FROM product_images
				WHERE product_id = p.id
				ORDER BY image_id ASC
				LIMIT 1
			) pi ON TRUE
			WHERE ${filter}
			ORDER BY o.created_at DESC, oi.id ASC
		`,
		values
	);

	return formatOrderRows(result.rows);
};

const findProductSupplyChainById = async (client, product_id) => {
	const result = await client.query(
		`
			SELECT
				p.id AS product_id,
				p.farmer_id,
				af.agent_id AS field_agent_id
			FROM products p
			LEFT JOIN agent_farmers af ON af.farmer_id = p.farmer_id
			WHERE p.id = $1
			ORDER BY af.id DESC NULLS LAST
			LIMIT 1
		`,
		[product_id]
	);

	return result.rows[0] || null;
};

const createOrderRecord = async (
	client,
	{ buyer_id, total_amount, address_id = null }
) => {
	const result = await client.query(
		`
			INSERT INTO orders (
				buyer_id,
				address_id,
				total_amount,
				total_price,
				order_status,
				payment_status,
				delivery_status
			)
			VALUES ($1, $2, $3, $3, 'pending', 'pending', 'pending')
			RETURNING
				id,
				buyer_id,
				address_id,
				total_price,
				total_amount,
				order_status,
				payment_status,
				delivery_status,
				created_at
		`,
		[buyer_id, address_id, total_amount]
	);

	return result.rows[0];
};

const createOrderItemRecord = async (client, { order_id, product_id, quantity, price }) => {
	const result = await client.query(
		`
			INSERT INTO order_items (order_id, product_id, quantity, price)
			VALUES ($1, $2, $3, $4)
			RETURNING id, order_id, product_id, quantity, price
		`,
		[order_id, product_id, quantity, price]
	);

	return result.rows[0];
};

const findOrderById = async (order_id, client = pool) => {
	const result = await client.query(
		`
			SELECT
				id,
				buyer_id,
				address_id,
				total_price,
				total_amount,
				order_status,
				payment_status,
				delivery_status,
				created_at
			FROM orders
			WHERE id = $1
		`,
		[order_id]
	);

	return result.rows[0] || null;
};

const assignDeliveryPartnerById = async (order_id, delivery_partner_id, client = pool) => {
	const result = await client.query(
		`
			UPDATE orders
			SET delivery_partner_id = $2,
					delivery_status = 'assigned'
			WHERE id = $1
			RETURNING
				id,
				buyer_id,
				address_id,
				total_price,
				total_amount,
				order_status,
				payment_status,
				delivery_partner_id,
				delivery_status,
				created_at
		`,
		[order_id, delivery_partner_id]
	);

	return result.rows[0] || null;
};

const updateOrderStatusById = async (order_id, order_status, client = pool) => {
	const result = await client.query(
		`
			UPDATE orders
			SET order_status = $1
			WHERE id = $2
			RETURNING
				id,
				buyer_id,
				address_id,
				total_price,
				total_amount,
				order_status,
				payment_status,
				delivery_status,
				created_at
		`,
		[order_status, order_id]
	);

	return result.rows[0] || null;
};

const decrementProductStock = async (client, product_id, quantity) => {
	// First try updating inventory table
	const invResult = await client.query(
		`
			UPDATE inventory
			SET quantity = quantity - $1,
					last_updated = NOW()
			WHERE product_id = $2
			RETURNING product_id AS id, quantity AS stock
		`,
		[quantity, product_id]
	);

	if (invResult.rows[0]) {
		return invResult.rows[0];
	}

	// Fallback: decrement stock directly on products table
	const prodResult = await client.query(
		`
			UPDATE products
			SET stock = stock - $1
			WHERE id = $2
			RETURNING id, stock
		`,
		[quantity, product_id]
	);

	return prodResult.rows[0] || null;
};

const updateOrderStatusesById = async (
	order_id,
	{ order_status, payment_status, delivery_status }
) => {
	if (order_status !== null) {
		await pool.query(
			`UPDATE orders SET order_status = $1 WHERE id = $2`,
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
				o.id,
				o.buyer_id,
				o.total_price,
				o.total_amount,
				o.order_status,
				o.payment_status,
				o.delivery_status,
				o.created_at
			FROM orders o
			WHERE o.id = $1
		`,
		[order_id]
	);

	return result.rows[0] || null;
};

module.exports = {
	assignDeliveryPartnerById,
	createOrderItemRecord,
	createOrderRecord,
	decrementProductStock,
	findOrderById,
	findProductSupplyChainById,
	formatOrderRows,
	getOrdersForBuyer,
	updateOrderStatusById,
	updateOrderStatusesById,
};
