const { pool } = require("../config/db");
const deliveryModel = require("../models/deliveryModel");
const { normalizeRole } = require("../utils/roles");
const { isPositiveInteger } = require("../utils/validators");

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

const assignDelivery = async ({ actor, payload }) => {
	if (normalizeRole(actor.role) !== "admin") {
		throw createServiceError("Only admins can assign delivery partners", 403);
	}

	const order_id = Number(payload.order_id);
	const delivery_partner_id = Number(payload.delivery_partner_id || payload.delivery_person_id);

	if (!isPositiveInteger(order_id) || !isPositiveInteger(delivery_partner_id)) {
		throw createServiceError("order_id and delivery_partner_id are required", 400);
	}

	const delivery_location =
		payload.delivery_location || payload.delivery_address || payload.address;

	if (!delivery_location || !String(delivery_location).trim()) {
		throw createServiceError("delivery_location is required", 400);
	}

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const order = await deliveryModel.findOrderById(client, order_id);

		if (!order) {
			throw createServiceError("Order not found", 404);
		}

		const partner = await deliveryModel.findDeliveryPartnerById(client, delivery_partner_id);

		if (!partner) {
			throw createServiceError("delivery_partner_id must belong to a delivery partner", 400);
		}

		const existingDelivery = await deliveryModel.findDeliveryByOrderIdForUpdate(client, order_id);

		if (existingDelivery) {
			throw createServiceError("Delivery partner already assigned for this order", 409);
		}

		const delivery = await deliveryModel.createDelivery(client, {
			order_id,
			delivery_partner_id: partner.id,
			pickup_location: payload.pickup_location ? String(payload.pickup_location).trim() : null,
			delivery_location: String(delivery_location).trim(),
			status: "assigned",
			estimated_time: payload.estimated_time || null,
		});

		await deliveryModel.updateOrderDeliveryStatus(client, {
			order_id,
			status: "assigned",
		});

		await client.query("COMMIT");
		return delivery;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const updateDeliveryStatus = async ({ actor, payload }) => {
	let order_id = payload.order_id;
	const delivery_id = payload.delivery_id;
	const status = payload.status || payload.delivery_status;

	if (!status) {
		throw createServiceError("status is required", 400);
	}

	if (order_id !== undefined && order_id !== null && !isPositiveInteger(order_id)) {
		throw createServiceError("order_id must be a valid integer", 400);
	}

	if (delivery_id !== undefined && delivery_id !== null && !isPositiveInteger(delivery_id)) {
		throw createServiceError("delivery_id must be a valid integer", 400);
	}

	if ((order_id === undefined || order_id === null) && (delivery_id === undefined || delivery_id === null)) {
		throw createServiceError("order_id or delivery_id is required", 400);
	}

	if (!allowedDeliveryStatuses.includes(String(status).trim().toLowerCase())) {
		throw createServiceError("Invalid delivery status value", 400);
	}

	const normalizedStatus = String(status).trim().toLowerCase();
	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		let existingDelivery = null;

		if (order_id !== undefined && order_id !== null) {
			existingDelivery = await deliveryModel.findDeliveryByOrderIdForUpdate(client, Number(order_id));
		} else {
			existingDelivery = await deliveryModel.findDeliveryByIdForUpdate(client, Number(delivery_id));
			if (existingDelivery) {
				order_id = existingDelivery.order_id;
			}
		}

		if (!existingDelivery) {
			throw createServiceError("Delivery not found for this order", 404);
		}

		const order = await deliveryModel.findOrderById(client, Number(order_id));

		if (!order) {
			throw createServiceError("Order not found", 404);
		}

		const actorRole = normalizeRole(actor.role);

		if (actorRole !== "delivery_partner") {
			throw createServiceError("Only delivery partners can update delivery status", 403);
		}

		if (Number(actor.id) !== Number(existingDelivery.delivery_partner_id)) {
			throw createServiceError("You are not allowed to update this delivery", 403);
		}

		const delivery = await deliveryModel.updateDeliveryByOrderId(client, {
			order_id: Number(order_id),
			status: normalizedStatus,
			estimated_time: payload.estimated_time || null,
			pickup_location:
				payload.pickup_location !== undefined ? String(payload.pickup_location).trim() : undefined,
			delivery_location:
				payload.delivery_location !== undefined ? String(payload.delivery_location).trim() : undefined,
		});

		await deliveryModel.updateOrderDeliveryStatus(client, {
			order_id: Number(order_id),
			status: normalizedStatus,
		});

		await client.query("COMMIT");
		return delivery;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
};

const trackDelivery = async ({ actor, order_id }) => {
	if (!isPositiveInteger(order_id)) {
		throw createServiceError("Invalid order id", 400);
	}

	const delivery = await deliveryModel.getDeliveryByOrderId(Number(order_id));

	if (!delivery) {
		throw createServiceError("Delivery not found for this order", 404);
	}

	const actorRole = normalizeRole(actor.role);

	if (
		actorRole !== "admin" &&
		Number(actor.id) !== Number(delivery.buyer_id) &&
		Number(actor.id) !== Number(delivery.delivery_partner_id)
	) {
		throw createServiceError("You are not allowed to view this delivery", 403);
	}

	return delivery;
};

module.exports = {
	allowedDeliveryStatuses,
	assignDelivery,
	trackDelivery,
	updateDeliveryStatus,
};
