// Payment service that validates and processes payments against existing orders.
const crypto = require("crypto");

const { pool } = require("../config/db");
const logger = require("../utils/logger");
const { isPositiveInteger } = require("../utils/validators");

const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const buildTransactionId = () => {
	return `txn_${crypto.randomBytes(8).toString("hex")}`;
};

const processPayment = async ({ userId, order_id, payment_method, amount }) => {
	const client = await pool.connect();

	try {
		const orderId = Number(order_id);
		const paymentAmount = Number(amount);

		if (!isPositiveInteger(orderId) || !payment_method || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
			throw createServiceError("order_id, payment_method, and a valid amount are required", 400);
		}

		await client.query("BEGIN");

		const orderResult = await client.query(
			`
				SELECT id, buyer_id, total_price, payment_status
				FROM orders
				WHERE id = $1
				FOR UPDATE
			`,
			[orderId]
		);

		if (orderResult.rows.length === 0) {
			throw createServiceError("Order not found", 404);
		}

		const order = orderResult.rows[0];

		if (order.buyer_id !== userId) {
			throw createServiceError("You can only pay for your own orders", 403);
		}

		if (order.payment_status === "paid") {
			throw createServiceError("Order has already been paid", 409);
		}

		if (Number(order.total_price) !== paymentAmount) {
			throw createServiceError("Payment amount does not match order total", 400);
		}

		const transactionId = buildTransactionId();
		const paymentStatus = "paid";

		const paymentResult = await client.query(
			`
				INSERT INTO payments (order_id, payment_method, amount, payment_status, transaction_id)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id, order_id, payment_method, amount, payment_status, transaction_id, created_at
			`,
			[orderId, payment_method.trim(), paymentAmount.toFixed(2), paymentStatus, transactionId]
		);

		await client.query(
			`
				UPDATE orders
				SET payment_status = $1,
						order_status = CASE WHEN order_status = 'pending' THEN 'confirmed' ELSE order_status END
				WHERE id = $2
			`,
			[paymentStatus, orderId]
		);

		await client.query("COMMIT");
		logger.info("Payment processed", { orderId, userId, paymentId: paymentResult.rows[0].id });
		return paymentResult.rows[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const getPaymentHistory = async (userId) => {
	const result = await pool.query(
		`
			SELECT
				p.id,
				p.order_id,
				p.payment_method,
				p.amount,
				p.payment_status,
				p.transaction_id,
				p.created_at,
				o.order_status,
				o.delivery_status,
				o.total_price
			FROM payments p
			JOIN orders o ON o.id = p.order_id
			WHERE o.buyer_id = $1
			ORDER BY p.created_at DESC
		`,
		[userId]
	);

	return result.rows;
};

module.exports = {
	allowedPaymentStatuses,
	getPaymentHistory,
	processPayment,
};
