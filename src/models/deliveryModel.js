const { pool } = require("../config/db");

const findOrderById = async (client, order_id) => {
	const result = await client.query(
		`SELECT order_id AS id, buyer_id, order_status FROM orders WHERE order_id = $1 FOR UPDATE`,
		[order_id]
	);

	return result.rows[0] || null;
};

const findDeliveryPartnerById = async (client, user_id) => {
	const result = await client.query(
		`
			SELECT u.user_id AS id, r.role_name AS role, r.role_name
			FROM users u
			LEFT JOIN roles r ON r.role_id = u.role_id
			WHERE u.user_id = $1
		`,
		[user_id]
	);
	return result.rows[0] || null;
};

const findDeliveryByOrderIdForUpdate = async (client, order_id) => {
	const result = await client.query(
		`SELECT * FROM deliveries WHERE order_id = $1 FOR UPDATE`,
		[order_id]
	);

	return result.rows[0] || null;
};

const findDeliveryByIdForUpdate = async (client, delivery_id) => {
	const result = await client.query(
		`SELECT * FROM deliveries WHERE delivery_id = $1 FOR UPDATE`,
		[delivery_id]
	);

	return result.rows[0] || null;
};

const createDelivery = async (
	client,
	{
		order_id,
		delivery_partner_id,
		pickup_location,
		delivery_location,
		status,
		estimated_time,
	}
) => {
	const result = await client.query(
		`
			INSERT INTO deliveries (
				order_id,
				delivery_partner_id,
				delivery_status,
				estimated_time
			)
			VALUES ($1, $2, $3, $4)
			RETURNING delivery_id AS id, order_id, delivery_partner_id, delivery_status AS status, estimated_time
		`,
		[order_id, delivery_partner_id, status, estimated_time]
	);

	result.rows[0].pickup_location = pickup_location || null;
	result.rows[0].delivery_location = delivery_location || null;
	result.rows[0].created_at = null;

	return result.rows[0];
};

const updateDeliveryByOrderId = async (
	client,
	{
		order_id,
		status,
		estimated_time = null,
		pickup_location = undefined,
		delivery_location = undefined,
	}
) => {
	const result = await client.query(
		`
			UPDATE deliveries
			SET delivery_status = $1,
				estimated_time = COALESCE($2, estimated_time),
				order_id = order_id
			WHERE order_id = $3
			RETURNING delivery_id AS id, order_id, delivery_partner_id, delivery_status AS status, estimated_time
		`,
		[status, estimated_time, order_id]
	);

	if (result.rows[0]) {
		result.rows[0].pickup_location = pickup_location !== undefined ? pickup_location : null;
		result.rows[0].delivery_location = delivery_location !== undefined ? delivery_location : null;
		result.rows[0].created_at = null;
	}

	return result.rows[0] || null;
};

const updateOrderDeliveryStatus = async (client, { order_id, status }) => {
	await client.query(
		`
			UPDATE orders
			SET order_status = CASE
						WHEN $1 = 'delivered' THEN 'delivered'
						WHEN $1 IN ('shipped', 'out for delivery') AND order_status = 'confirmed' THEN 'shipped'
						ELSE order_status
					END
			WHERE order_id = $2
		`,
		[status, order_id]
	);
};

const getDeliveryByOrderId = async (order_id) => {
	const result = await pool.query(
		`
			SELECT
				d.delivery_id AS id,
				d.order_id,
				d.delivery_partner_id,
				NULL::text AS pickup_location,
				NULL::text AS delivery_location,
				d.delivery_status AS status,
				d.estimated_time,
				o.buyer_id,
				o.order_status,
				COALESCE(p.payment_status, 'pending') AS payment_status,
				u.name AS delivery_partner_name,
				u.email AS delivery_partner_email
			FROM deliveries d
			JOIN orders o ON o.order_id = d.order_id
			LEFT JOIN payments p ON p.order_id = o.order_id
			LEFT JOIN users u ON u.user_id = d.delivery_partner_id
			WHERE d.order_id = $1
		`,
		[order_id]
	);

	return result.rows[0] || null;
};

module.exports = {
	createDelivery,
	findDeliveryByOrderIdForUpdate,
	findDeliveryByIdForUpdate,
	findDeliveryPartnerById,
	findOrderById,
	getDeliveryByOrderId,
	updateDeliveryByOrderId,
	updateOrderDeliveryStatus,
};