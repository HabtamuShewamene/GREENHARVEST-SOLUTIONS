const { pool } = require("../config/db");

const findOrderByIdForUpdate = async (client, order_id) => {
	const result = await client.query(
		`
			SELECT
				o.order_id AS id,
				o.buyer_id,
				o.total_amount,
				o.total_amount AS total_price,
				COALESCE(p.payment_status, 'pending') AS payment_status
			FROM orders o
			LEFT JOIN payments p ON p.order_id = o.order_id
			WHERE o.order_id = $1
			FOR UPDATE
		`,
		[order_id]
	);

	return result.rows[0] || null;
};

const createPayment = async (
	client,
	{ order_id, payment_method, amount, payment_status, transaction_id }
) => {
	const result = await client.query(
		`
			INSERT INTO payments (order_id, payment_method, payment_status, paid_at)
			VALUES ($1, $2, $3, NOW())
			RETURNING payment_id AS id, order_id, payment_method, payment_status, paid_at
		`,
		[order_id, payment_method, payment_status]
	);

	result.rows[0].amount = amount;
	result.rows[0].transaction_id = transaction_id;
	result.rows[0].created_at = result.rows[0].paid_at;

	return result.rows[0];
};

const createTransaction = async (client, { payment_id, amount }) => {
	const result = await client.query(
		`
			INSERT INTO transactions (payment_id, amount, transaction_date)
			VALUES ($1, $2, NOW())
			RETURNING transaction_id AS id, payment_id, amount, transaction_date AS created_at
		`,
		[payment_id, amount]
	);

	return result.rows[0];
};

const updateOrderPaymentStatus = async (client, { order_id, payment_status }) => {
	await client.query(
		`
			UPDATE payments
			SET payment_status = $1,
					paid_at = NOW()
			WHERE order_id = $2
		`,
		[payment_status, order_id]
	);
};

const getPaymentHistoryByBuyer = async (user_id) => {
	const result = await pool.query(
		`
			SELECT
				p.payment_id AS id,
				p.order_id,
				p.payment_method,
				t.amount,
				p.payment_status,
				t.transaction_id,
				COALESCE(t.transaction_date, p.paid_at) AS created_at,
				o.order_status,
				COALESCE(d.delivery_status, 'pending') AS delivery_status,
				o.total_amount AS total_price,
				o.total_amount
			FROM payments p
			JOIN orders o ON o.order_id = p.order_id
			LEFT JOIN transactions t ON t.payment_id = p.payment_id
			LEFT JOIN deliveries d ON d.order_id = o.order_id
			WHERE o.buyer_id = $1
			ORDER BY COALESCE(t.transaction_date, p.paid_at) DESC
		`,
		[user_id]
	);

	return result.rows;
};

const getTransactionHistoryByUser = async (user_id) => {
	const result = await pool.query(
		`
			SELECT
				t.transaction_id AS id,
				p.order_id,
				o.buyer_id AS user_id,
				t.amount,
				p.payment_method,
				p.payment_status AS status,
				t.transaction_date AS created_at
			FROM transactions t
			JOIN payments p ON p.payment_id = t.payment_id
			JOIN orders o ON o.order_id = p.order_id
			WHERE o.buyer_id = $1
			ORDER BY t.transaction_date DESC
		`,
		[user_id]
	);

	return result.rows;
};

module.exports = {
	createPayment,
	createTransaction,
	findOrderByIdForUpdate,
	getPaymentHistoryByBuyer,
	getTransactionHistoryByUser,
	updateOrderPaymentStatus,
};