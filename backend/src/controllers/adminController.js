const logger = require("../utils/logger");
const adminService = require("../services/adminService");

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

const getAdminDashboard = async (req, res) => {
	try {
		const analytics = await adminService.getDashboardAnalytics();

		return res.status(200).json({
			metrics: analytics,
		});
	} catch (error) {
		return handleControllerError(res, "Get admin dashboard failed", error, {
			userId: req.user && req.user.id,
		});
	}
};

module.exports = {
	getAdminDashboard,
};
