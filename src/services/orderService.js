// Order service that manages order creation, totals, inventory updates, and status changes.
const { pool } = require("../config/db");
const logger = require("../utils/logger");
const orderModel = require("../models/orderModel");
const { isPositiveInteger } = require("../utils/validators");

const allowedOrderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];
const allowedDeliveryStatuses = [
	"pending",
	"assigned",
	"processing",
	"shipped",
	"out for delivery",
	"delivered",
	"cancelled",
];

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const getOrdersForBuyer = async (buyerId, orderId = null) => {
	return orderModel.getOrdersForBuyer(buyerId, orderId);
};

const createOrder = async (buyerId) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const cartResult = await client.query(
			`
				SELECT
					ci.cart_item_id AS id,
					ci.product_id,
					ci.quantity,
					p.name,
					p.price,
					COALESCE(i.quantity, 0) AS stock,
					c.cart_id
				FROM carts c
				JOIN cart_items ci ON ci.cart_id = c.cart_id
				JOIN products p ON p.id = ci.product_id
				LEFT JOIN inventory i ON i.product_id = p.id
				WHERE c.user_id = $1
				ORDER BY ci.cart_item_id ASC
				FOR UPDATE OF c, ci, i
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

		const order = await orderModel.createOrderRecord(client, buyerId, totalPrice.toFixed(2));

		for (const item of cartResult.rows) {
			await orderModel.createOrderItemRecord(client, {
				orderId: order.id,
				productId: item.product_id,
				quantity: item.quantity,
				price: item.price,
			});

			await orderModel.decrementProductStock(client, item.product_id, item.quantity);
		}

		await client.query(
			`
				DELETE FROM cart_items ci
				USING carts c
				WHERE ci.cart_id = c.cart_id AND c.user_id = $1
			`,
			[buyerId]
		);
		await client.query("UPDATE carts SET updated_at = NOW() WHERE user_id = $1", [buyerId]);
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

	const order = await orderModel.updateOrderStatusesById(Number(orderId), {
		orderStatus: order_status !== undefined ? order_status : null,
		paymentStatus: payment_status !== undefined ? payment_status : null,
		deliveryStatus: delivery_status !== undefined ? delivery_status : null,
	});

	if (!order) {
		throw createServiceError("Order not found", 404);
	}

	return order;
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
