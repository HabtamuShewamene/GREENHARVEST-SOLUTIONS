// Order service that manages order creation, totals, inventory updates, and status changes.
const { pool } = require("../config/db");
const logger = require("../utils/logger");
const { isPositiveInteger } = require("../utils/validators");

const allowedOrderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];
const allowedDeliveryStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

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
				o.total_price,
				o.order_status,
				o.payment_status,
				o.delivery_status,
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

const createOrder = async (buyerId) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const cartResult = await client.query(
			`
				SELECT
					c.id,
					c.product_id,
					c.quantity,
					p.name,
					p.price,
					p.stock
				FROM cart c
				JOIN products p ON p.id = c.product_id
				WHERE c.user_id = $1
				ORDER BY c.id ASC
				FOR UPDATE OF p, c
			`,
			[buyerId]
		);

		if (cartResult.rows.length === 0) {
			throw createServiceError("Cart is empty", 400);
		}

		let totalPrice = 0;

		for (const item of cartResult.rows) {
			if (item.stock < item.quantity) {
				throw createServiceError(`Insufficient stock for product: ${item.name}`, 400);
			}

			totalPrice += Number(item.price) * item.quantity;
		}

		const orderResult = await client.query(
			`
				INSERT INTO orders (buyer_id, total_price)
				VALUES ($1, $2)
				RETURNING id, buyer_id, total_price, order_status, payment_status, delivery_status, created_at
			`,
			[buyerId, totalPrice.toFixed(2)]
		);

		const order = orderResult.rows[0];

		for (const item of cartResult.rows) {
			await client.query(
				`
					INSERT INTO order_items (order_id, product_id, quantity, price)
					VALUES ($1, $2, $3, $4)
				`,
				[order.id, item.product_id, item.quantity, item.price]
			);

			await client.query(
				`
					UPDATE products
					SET stock = stock - $1
					WHERE id = $2
				`,
				[item.quantity, item.product_id]
			);
		}

		await client.query("DELETE FROM cart WHERE user_id = $1", [buyerId]);
		await client.query("COMMIT");

		logger.info("Order created", { orderId: order.id, buyerId });
		const createdOrders = await getOrdersForBuyer(buyerId, order.id);
		return createdOrders[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const getOrderByIdForBuyer = async (buyerId, orderId) => {
	if (!isPositiveInteger(orderId)) {
		throw createServiceError("Invalid order id", 400);
	}

	const orders = await getOrdersForBuyer(buyerId, Number(orderId));

	if (orders.length === 0) {
		throw createServiceError("Order not found", 404);
	}

	return orders[0];
};

const updateOrderStatus = async ({ adminUser, orderId, order_status, payment_status, delivery_status }) => {
	if (!adminUser || adminUser.role !== "admin") {
		throw createServiceError("Only admins can update order status", 403);
	}

	if (!isPositiveInteger(orderId)) {
		throw createServiceError("Invalid order id", 400);
	}

	if (
		order_status === undefined &&
		payment_status === undefined &&
		delivery_status === undefined
	) {
		throw createServiceError("At least one status field is required", 400);
	}

	if (order_status !== undefined && !allowedOrderStatuses.includes(order_status)) {
		throw createServiceError("Invalid order_status value", 400);
	}

	if (payment_status !== undefined && !allowedPaymentStatuses.includes(payment_status)) {
		throw createServiceError("Invalid payment_status value", 400);
	}

	if (delivery_status !== undefined && !allowedDeliveryStatuses.includes(delivery_status)) {
		throw createServiceError("Invalid delivery_status value", 400);
	}

	const result = await pool.query(
		`
			UPDATE orders
			SET
				order_status = COALESCE($1, order_status),
				payment_status = COALESCE($2, payment_status),
				delivery_status = COALESCE($3, delivery_status)
			WHERE id = $4
			RETURNING id, buyer_id, total_price, order_status, payment_status, delivery_status, created_at
		`,
		[
			order_status !== undefined ? order_status : null,
			payment_status !== undefined ? payment_status : null,
			delivery_status !== undefined ? delivery_status : null,
			Number(orderId),
		]
	);

	if (result.rows.length === 0) {
		throw createServiceError("Order not found", 404);
	}

	return result.rows[0];
};

module.exports = {
	allowedDeliveryStatuses,
	allowedOrderStatuses,
	allowedPaymentStatuses,
	createOrder,
	getOrderByIdForBuyer,
	getOrdersForBuyer,
	updateOrderStatus,
};
