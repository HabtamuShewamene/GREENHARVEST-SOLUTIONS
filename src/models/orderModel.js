const { pool } = require("../config/db");

const formatOrderRows = (rows) => {
	const ordersMap = new Map();

	rows.forEach((row) => {
		if (!ordersMap.has(row.order_id)) {
			ordersMap.set(row.order_id, {
				id: row.order_id,
				buyer_id: row.buyer_id,
				total_price: row.total_price,
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

const getOrdersForBuyer = async (buyerId, orderId = null) => {
	const values = [buyerId];
	let filter = "o.buyer_id = $1";

	if (orderId !== null) {
		values.push(orderId);
		filter += " AND o.id = $2";
	}

	const result = await pool.query(
		`
			SELECT
				o.id AS order_id,
				o.buyer_id,
				COALESCE(o.total_amount, o.total_price) AS total_price,
				COALESCE(o.total_amount, o.total_price) AS total_amount,
				o.order_status,
				o.payment_status,
				o.delivery_status,
				o.address_id,
				o.created_at,
				oi.id AS order_item_id,
				oi.product_id,
				oi.quantity,
				oi.price,
				p.name AS product_name,
				p.image_url,
				p.farm_location,
				p.farmer_id
			FROM orders o
			LEFT JOIN order_items oi ON oi.order_id = o.id
			LEFT JOIN products p ON p.id = oi.product_id
			WHERE ${filter}
			ORDER BY o.created_at DESC, oi.id ASC
		`,
		values
	);

	return formatOrderRows(result.rows);
};

const createOrderRecord = async (client, buyerId, totalPrice) => {
	const result = await client.query(
		`
			INSERT INTO orders (buyer_id, total_price, total_amount)
			VALUES ($1, $2, $2)
			RETURNING id, buyer_id, total_price, total_amount, order_status, payment_status, delivery_status, created_at
		`,
		[buyerId, totalPrice]
	);

	return result.rows[0];
};

const createOrderItemRecord = async (client, { orderId, productId, quantity, price }) => {
	const result = await client.query(
		`
			INSERT INTO order_items (order_id, product_id, quantity, price)
			VALUES ($1, $2, $3, $4)
			RETURNING id, order_id, product_id, quantity, price, created_at
		`,
		[orderId, productId, quantity, price]
	);

	return result.rows[0];
};

const decrementProductStock = async (client, productId, quantity) => {
	const result = await client.query(
		`
			UPDATE inventory
			SET quantity = quantity - $1,
					last_updated = NOW()
			WHERE product_id = $2
			RETURNING product_id AS id, quantity AS stock
		`,
		[quantity, productId]
	);

	return result.rows[0] || null;
};

const updateOrderStatusesById = async (orderId, { orderStatus, paymentStatus, deliveryStatus }) => {
	const result = await pool.query(
		`
			UPDATE orders
			SET
				order_status = COALESCE($1, order_status),
				payment_status = COALESCE($2, payment_status),
				delivery_status = COALESCE($3, delivery_status)
			WHERE id = $4
			RETURNING id, buyer_id, total_price, total_amount, order_status, payment_status, delivery_status, created_at
		`,
		[orderStatus, paymentStatus, deliveryStatus, orderId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createOrderItemRecord,
	createOrderRecord,
	decrementProductStock,
	formatOrderRows,
	getOrdersForBuyer,
	updateOrderStatusesById,
};
