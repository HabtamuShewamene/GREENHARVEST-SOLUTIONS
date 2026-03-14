const { pool } = require("../config/db");

const findOrderById = async (client, order_id) => {
	const result = await client.query(
		`SELECT id, buyer_id, order_status, payment_status FROM orders WHERE id = $1 FOR UPDATE`,
		[order_id]
	);

	return result.rows[0] || null;
};

const findDeliveryPartnerById = async (client, user_id) => {
	const result = await client.query(
		`
			SELECT u.id, COALESCE(u.role, r.role_name) AS role, r.role_name
			FROM users u
			LEFT JOIN roles r ON r.role_id = u.role_id
			WHERE u.id = $1
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
		`SELECT * FROM deliveries WHERE id = $1 FOR UPDATE`,
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
				delivery_person_id,
				pickup_location,
				delivery_location,
				delivery_address,
				status,
				delivery_status,
				estimated_time
			)
			VALUES ($1, $2, $2, $3, $4, $4, $5, $5, $6)
			RETURNING id, order_id, delivery_partner_id, pickup_location, delivery_location, status, estimated_time, created_at
		`,
		[order_id, delivery_partner_id, pickup_location, delivery_location, status, estimated_time]
	);

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
			SET status = $1,
				delivery_status = $1,
				estimated_time = COALESCE($2, estimated_time),
				pickup_location = COALESCE($3, pickup_location),
				delivery_location = COALESCE($4, delivery_location),
				delivery_address = COALESCE($4, delivery_address)
			WHERE order_id = $5
			RETURNING id, order_id, delivery_partner_id, pickup_location, delivery_location, status, estimated_time, created_at
		`,
		[status, estimated_time, pickup_location, delivery_location, order_id]
	);

	return result.rows[0] || null;
};

const updateOrderDeliveryStatus = async (client, { order_id, status }) => {
	await client.query(
		`
			UPDATE orders
			SET delivery_status = $1,
					order_status = CASE
						WHEN $1 = 'delivered' THEN 'delivered'
						WHEN $1 IN ('shipped', 'out for delivery') AND order_status = 'confirmed' THEN 'shipped'
						ELSE order_status
					END
			WHERE id = $2
		`,
		[status, order_id]
	);
};

const getDeliveryByOrderId = async (order_id) => {
	const result = await pool.query(
		`
			SELECT
				d.id,
				d.order_id,
				d.delivery_partner_id,
				d.pickup_location,
				d.delivery_location,
				d.status,
				d.estimated_time,
				o.buyer_id,
				o.order_status,
				o.payment_status,
				u.name AS delivery_partner_name,
				u.email AS delivery_partner_email
			FROM deliveries d
			JOIN orders o ON o.id = d.order_id
			LEFT JOIN users u ON u.id = d.delivery_partner_id
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