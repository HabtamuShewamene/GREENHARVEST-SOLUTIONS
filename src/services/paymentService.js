// Payment service that validates and processes payments against existing orders.
const crypto = require("crypto");

const { pool } = require("../config/db");
const logger = require("../utils/logger");
const paymentModel = require("../models/paymentModel");
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

		const order = await paymentModel.findOrderByIdForUpdate(client, orderId);

		if (!order) {
			throw createServiceError("Order not found", 404);
		}

		if (Number(order.buyer_id) !== Number(userId)) {
			throw createServiceError("You can only pay for your own orders", 403);
		}

		if (order.payment_status === "paid") {
			throw createServiceError("Order has already been paid", 409);
		}

		if (Number(order.total_amount) !== paymentAmount) {
			throw createServiceError("Payment amount does not match order total", 400);
		}

		const transactionId = buildTransactionId();
		const paymentStatus = "paid";

		const payment = await paymentModel.createPayment(client, {
			orderId,
			paymentMethod: payment_method.trim(),
			amount: paymentAmount.toFixed(2),
			paymentStatus,
			transactionId,
		});

		await paymentModel.createTransaction(client, {
			orderId,
			userId,
			amount: paymentAmount.toFixed(2),
			paymentMethod: payment_method.trim(),
			status: paymentStatus,
		});

		await paymentModel.updateOrderPaymentStatus(client, {
			orderId,
			paymentStatus,
		});

		await client.query("COMMIT");
		logger.info("Payment processed", { orderId, userId, paymentId: payment.id });
		return payment;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const getPaymentHistory = async (userId) => {
	const [payments, transactions] = await Promise.all([
		paymentModel.getPaymentHistoryByBuyer(userId),
		paymentModel.getTransactionHistoryByUser(userId),
	]);

	return {
		payments,
		transactions,
	};
};

module.exports = {
	allowedPaymentStatuses,
	getPaymentHistory,
	processPayment,
};
