const logger = require("../utils/logger");
const deliveryService = require("../services/deliveryService");

const handleControllerError = (res, context, error, meta = {}) => {
	logger.error(context, {
		message: error.message,
		code: error.code,
		stack: error.stack,
		...meta,
	});

	return res.status(error.statusCode || 500).json({
		message: error.statusCode ? error.message : "Internal server error",
	});
};

const assignDeliveryPartner = async (req, res) => {
	try {
		const delivery = await deliveryService.assignDelivery({
			actor: req.user,
			payload: req.body || {},
		});

		return res.status(201).json({
			message: "Delivery partner assigned successfully",
			delivery,
		});
	} catch (error) {
		return handleControllerError(res, "Assign delivery failed", error, {
			userId: req.user && req.user.id,
			body: req.body,
		});
	}
};

const updateDeliveryStatus = async (req, res) => {
	try {
		const payload = {
			...(req.body || {}),
			order_id: req.body && req.body.order_id ? req.body.order_id : undefined,
			delivery_id: req.params.id,
		};

		const delivery = await deliveryService.updateDeliveryStatus({
			actor: req.user,
			payload,
		});

		return res.status(200).json({
			message: "Delivery status updated successfully",
			delivery,
		});
	} catch (error) {
		return handleControllerError(res, "Update delivery status failed", error, {
			userId: req.user && req.user.id,
			params: req.params,
			body: req.body,
		});
	}
};

const trackDelivery = async (req, res) => {
	try {
		const order_id = req.params.order_id || req.params.orderId;
		const delivery = await deliveryService.trackDelivery({
			actor: req.user,
			order_id,
		});

		return res.status(200).json({
			delivery,
		});
	} catch (error) {
		return handleControllerError(res, "Track delivery failed", error, {
			userId: req.user && req.user.id,
			params: req.params,
		});
	}
};

module.exports = {
	assignDeliveryPartner,
	trackDelivery,
	updateDeliveryStatus,
};
