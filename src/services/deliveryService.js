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

	const orderId = Number(payload.order_id);
	const deliveryPartnerId = Number(payload.delivery_partner_id || payload.delivery_person_id);

	if (!isPositiveInteger(orderId) || !isPositiveInteger(deliveryPartnerId)) {
		throw createServiceError("order_id and delivery_partner_id are required", 400);
	}

	const deliveryLocation =
		payload.delivery_location || payload.delivery_address || payload.address;

	if (!deliveryLocation || !String(deliveryLocation).trim()) {
		throw createServiceError("delivery_location is required", 400);
	}

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const order = await deliveryModel.findOrderById(client, orderId);

		if (!order) {
			throw createServiceError("Order not found", 404);
		}

		const partner = await deliveryModel.findDeliveryPartnerById(client, deliveryPartnerId);

		if (!partner || normalizeRole(partner.role) !== "deliveryPartner") {
			throw createServiceError("delivery_partner_id must belong to a delivery partner", 400);
		}

		const existingDelivery = await deliveryModel.findDeliveryByOrderIdForUpdate(client, orderId);

		if (existingDelivery) {
			throw createServiceError("Delivery partner already assigned for this order", 409);
		}

		const delivery = await deliveryModel.createDelivery(client, {
			orderId,
			deliveryPartnerId,
			pickupLocation: payload.pickup_location ? String(payload.pickup_location).trim() : null,
			deliveryLocation: String(deliveryLocation).trim(),
			status: "assigned",
			estimatedTime: payload.estimated_time || null,
		});

		await deliveryModel.updateOrderDeliveryStatus(client, {
			orderId,
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
	let orderId = payload.order_id || payload.orderId;
	const deliveryId = payload.delivery_id;
	const status = payload.status || payload.delivery_status;

	if (!status) {
		throw createServiceError("status is required", 400);
	}

	if (orderId !== undefined && orderId !== null && !isPositiveInteger(orderId)) {
		throw createServiceError("order_id must be a valid integer", 400);
	}

	if (deliveryId !== undefined && deliveryId !== null && !isPositiveInteger(deliveryId)) {
		throw createServiceError("delivery_id must be a valid integer", 400);
	}

	if ((orderId === undefined || orderId === null) && (deliveryId === undefined || deliveryId === null)) {
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

		if (orderId !== undefined && orderId !== null) {
			existingDelivery = await deliveryModel.findDeliveryByOrderIdForUpdate(client, Number(orderId));
		} else {
			existingDelivery = await deliveryModel.findDeliveryByIdForUpdate(client, Number(deliveryId));
			if (existingDelivery) {
				orderId = existingDelivery.order_id;
			}
		}

		if (!existingDelivery) {
			throw createServiceError("Delivery not found for this order", 404);
		}

		const order = await deliveryModel.findOrderById(client, Number(orderId));

		if (!order) {
			throw createServiceError("Order not found", 404);
		}

		const actorRole = normalizeRole(actor.role);

		if (
			actorRole !== "admin" &&
			!(actorRole === "deliveryPartner" && Number(actor.id) === Number(existingDelivery.delivery_partner_id))
		) {
			throw createServiceError("You are not allowed to update this delivery", 403);
		}

		const delivery = await deliveryModel.updateDeliveryByOrderId(client, {
			orderId: Number(orderId),
			status: normalizedStatus,
			estimatedTime: payload.estimated_time || null,
			pickupLocation:
				payload.pickup_location !== undefined ? String(payload.pickup_location).trim() : undefined,
			deliveryLocation:
				payload.delivery_location !== undefined ? String(payload.delivery_location).trim() : undefined,
		});

		await deliveryModel.updateOrderDeliveryStatus(client, {
			orderId: Number(orderId),
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

const trackDelivery = async ({ actor, orderId }) => {
	if (!isPositiveInteger(orderId)) {
		throw createServiceError("Invalid order id", 400);
	}

	const delivery = await deliveryModel.getDeliveryByOrderId(Number(orderId));

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