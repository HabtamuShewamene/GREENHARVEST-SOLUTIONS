// Payment service that validates and processes payments against existing orders.
const crypto = require("crypto");

const { pool } = require("../config/db");
const logger = require("../utils/logger");
const notificationModel = require("../models/notificationModel");
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

const emitPaymentSucceededNotification = async ({ user_id, order_id }) => {
	if (!user_id || !order_id) {
		return;
	}

	try {
		await notificationModel.createNotificationForUser({
			user_id: Number(user_id),
			title: "Payment received",
			message: `Payment for order #${order_id} was successful.`,
			type: "payment",
		});
	} catch (error) {
		logger.warn("Payment notification emit failed", {
			order_id,
			user_id,
			message: error.message,
			code: error.code,
		});
	}
};

const processPayment = async ({ user_id, order_id, payment_method, amount }) => {
	const client = await pool.connect();

	try {
		const parsed_order_id = Number(order_id);
		const payment_amount = Number(amount);

		if (
			!isPositiveInteger(parsed_order_id) ||
			!payment_method ||
			Number.isNaN(payment_amount) ||
			payment_amount <= 0
		) {
			throw createServiceError("order_id, payment_method, and a valid amount are required", 400);
		}

		await client.query("BEGIN");

		const order = await paymentModel.findOrderByIdForUpdate(client, parsed_order_id);

		if (!order) {
			throw createServiceError("Order not found", 404);
		}

		if (Number(order.buyer_id) !== Number(user_id)) {
			throw createServiceError("You can only pay for your own orders", 403);
		}

		if (order.payment_status === "paid") {
			throw createServiceError("Order has already been paid", 409);
		}

		if (Number(order.total_amount) !== payment_amount) {
			throw createServiceError("Payment amount does not match order total", 400);
		}

		const transaction_id = buildTransactionId();
		const payment_status = "paid";

		const payment = await paymentModel.createPayment(client, {
			order_id: parsed_order_id,
			payment_method: payment_method.trim(),
			amount: payment_amount.toFixed(2),
			payment_status,
			transaction_id,
		});

		await paymentModel.createTransaction(client, {
			payment_id: payment.id,
			amount: payment_amount.toFixed(2),
		});

		await paymentModel.updateOrderPaymentStatus(client, {
			order_id: parsed_order_id,
			payment_status,
		});

		await client.query("COMMIT");
		await emitPaymentSucceededNotification({
			user_id,
			order_id: parsed_order_id,
		});
		logger.info("Payment processed", { order_id: parsed_order_id, user_id, payment_id: payment.id });
		return payment;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const getPaymentHistory = async (user_id) => {
	const [payments, transactions] = await Promise.all([
		paymentModel.getPaymentHistoryByBuyer(user_id),
		paymentModel.getTransactionHistoryByUser(user_id),
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
