const { pool } = require("../config/db");

const findOrderByIdForUpdate = async (client, order_id) => {
	const result = await client.query(
		`
			SELECT id, buyer_id, COALESCE(total_amount, total_price) AS total_amount, total_price, payment_status
			FROM orders
			WHERE id = $1
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
			INSERT INTO payments (order_id, payment_method, amount, payment_status, transaction_id)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, order_id, payment_method, amount, payment_status, transaction_id, created_at
		`,
		[order_id, payment_method, amount, payment_status, transaction_id]
	);

	return result.rows[0];
};

const createTransaction = async (client, { order_id, user_id, amount, payment_method, status }) => {
	const result = await client.query(
		`
			INSERT INTO transactions (order_id, user_id, amount, payment_method, status)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, order_id, user_id, amount, payment_method, status, created_at
		`,
		[order_id, user_id, amount, payment_method, status]
	);

	return result.rows[0];
};

const updateOrderPaymentStatus = async (client, { order_id, payment_status }) => {
	await client.query(
		`
			UPDATE orders
			SET payment_status = $1,
					order_status = CASE WHEN order_status = 'pending' THEN 'confirmed' ELSE order_status END
			WHERE id = $2
		`,
		[payment_status, order_id]
	);
};

const getPaymentHistoryByBuyer = async (user_id) => {
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
				COALESCE(o.total_amount, o.total_price) AS total_price,
				COALESCE(o.total_amount, o.total_price) AS total_amount
			FROM payments p
			JOIN orders o ON o.id = p.order_id
			WHERE o.buyer_id = $1
			ORDER BY p.created_at DESC
		`,
		[user_id]
	);

	return result.rows;
};

const getTransactionHistoryByUser = async (user_id) => {
	const result = await pool.query(
		`
			SELECT id, order_id, user_id, amount, payment_method, status, created_at
			FROM transactions
			WHERE user_id = $1
			ORDER BY created_at DESC
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