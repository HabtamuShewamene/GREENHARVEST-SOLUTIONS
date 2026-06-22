const logger = require("../utils/logger");
const inventoryService = require("../services/inventoryService");

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

const updateInventory = async (req, res) => {
	try {
		const inventory = await inventoryService.updateInventory({
			actor: req.user,
			payload: req.body || {},
		});

		return res.status(200).json({
			message: "Inventory updated successfully",
			inventory,
		});
	} catch (error) {
		return handleControllerError(res, "Update inventory failed", error, {
			userId: req.user && req.user.id,
			body: req.body,
		});
	}
};

const getInventoryByProduct = async (req, res) => {
	try {
		const inventory = await inventoryService.getInventoryByProductId(req.params.productId);

		return res.status(200).json({
			inventory,
		});
	} catch (error) {
		return handleControllerError(res, "Get inventory failed", error, {
			userId: req.user && req.user.id,
			productId: req.params.productId,
		});
	}
};

module.exports = {
	getInventoryByProduct,
	updateInventory,
};