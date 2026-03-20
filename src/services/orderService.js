// Order service that manages order creation, totals, inventory updates, and status changes.
const { pool } = require("../config/db");
const logger = require("../utils/logger");
const orderModel = require("../models/orderModel");
const { normalizeRole } = require("../utils/roles");
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

const getOrdersForBuyer = async (buyer_id, order_id = null) => {
	return orderModel.getOrdersForBuyer(buyer_id, order_id);
};

const resolveOrderSupplyChain = async (client, cartItems) => {
	let farmer_id = null;
	let field_agent_id = null;

	for (const item of cartItems) {
		const product_id = Number(item.product_id);
		const supplyChain = await orderModel.findProductSupplyChainById(client, product_id);

		if (!supplyChain) {
			throw createServiceError(`Product not found for cart item: ${product_id}`, 404);
		}

		if (!supplyChain.farmer_id) {
			throw createServiceError(`Farmer not found for product: ${product_id}`, 400);
		}

		if (!supplyChain.field_agent_id) {
			throw createServiceError(`Field agent not assigned for farmer: ${supplyChain.farmer_id}`, 400);
		}

		if (farmer_id === null) {
			farmer_id = Number(supplyChain.farmer_id);
			field_agent_id = Number(supplyChain.field_agent_id);
			continue;
		}

		if (farmer_id !== Number(supplyChain.farmer_id)) {
			throw createServiceError(
				"All products in an order must belong to the same farmer",
				400
			);
		}

		if (field_agent_id !== Number(supplyChain.field_agent_id)) {
			throw createServiceError(
				"All products in an order must belong to the same field agent",
				400
			);
		}
	}

	return {
		farmer_id,
		field_agent_id,
	};
};

const createOrder = async (buyer_id, payload = {}) => {
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const address_id =
			payload.address_id === undefined || payload.address_id === null
				? null
				: Number(payload.address_id);

		if (address_id !== null && !isPositiveInteger(address_id)) {
			throw createServiceError("address_id must be a valid integer", 400);
		}

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
				JOIN products p ON p.product_id = ci.product_id
				LEFT JOIN inventory i ON i.product_id = p.product_id
				WHERE c.buyer_id = $1
				ORDER BY ci.cart_item_id ASC
				FOR UPDATE OF c, ci
			`,
			[buyer_id]
		);

		if (cartResult.rows.length === 0) {
			throw createServiceError("Cart is empty", 400);
		}

		let total_amount = 0;

		for (const item of cartResult.rows) {
			if (item.stock < item.quantity) {
				throw createServiceError(`Insufficient stock for product: ${item.name}`, 400);
			}

			total_amount += Number(item.price) * item.quantity;
		}

		const { farmer_id, field_agent_id } = await resolveOrderSupplyChain(client, cartResult.rows);

		const order = await orderModel.createOrderRecord(client, {
			buyer_id,
			farmer_id,
			field_agent_id,
			delivery_partner_id: null,
			total_amount: total_amount.toFixed(2),
			address_id,
		});

		for (const item of cartResult.rows) {
			await orderModel.createOrderItemRecord(client, {
				order_id: order.id,
				product_id: item.product_id,
				quantity: item.quantity,
				price: item.price,
			});

			const updatedInventory = await orderModel.decrementProductStock(
				client,
				item.product_id,
				item.quantity
			);

			if (!updatedInventory || Number(updatedInventory.stock) < 0) {
				throw createServiceError(`Insufficient stock for product: ${item.name}`, 400);
			}
		}

		await client.query(
			`
				DELETE FROM cart_items ci
				USING carts c
				WHERE ci.cart_id = c.cart_id AND c.buyer_id = $1
			`,
			[buyer_id]
		);
		await client.query("COMMIT");

		logger.info("Order created", { order_id: order.id, buyer_id });
		const createdOrders = await getOrdersForBuyer(buyer_id, order.id);
		return createdOrders[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const getOrderByIdForBuyer = async (buyer_id, order_id) => {
	if (!isPositiveInteger(order_id)) {
		throw createServiceError("Invalid order id", 400);
	}

	const orders = await getOrdersForBuyer(buyer_id, Number(order_id));

	if (orders.length === 0) {
		throw createServiceError("Order not found", 404);
	}

	return orders[0];
};

const updateOrderStatus = async ({ admin_user, order_id, order_status, payment_status, delivery_status }) => {
	if (!admin_user || normalizeRole(admin_user.role) !== "admin") {
		throw createServiceError("Only admins can update order status", 403);
	}

	if (!isPositiveInteger(order_id)) {
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

	const order = await orderModel.updateOrderStatusesById(Number(order_id), {
		order_status: order_status !== undefined ? order_status : null,
		payment_status: payment_status !== undefined ? payment_status : null,
		delivery_status: delivery_status !== undefined ? delivery_status : null,
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
