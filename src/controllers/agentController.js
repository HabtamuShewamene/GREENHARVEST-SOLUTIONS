const logger = require("../utils/logger");
const agentService = require("../services/agentService");

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

const assignFarmer = async (req, res) => {
	try {
		const assignment = await agentService.assignFarmer({
			actor: req.user,
			agent_id: req.body && req.body.agent_id,
			farmer_id: req.body && req.body.farmer_id,
		});

		return res.status(201).json({
			message: "Farmer assigned to field agent successfully",
			assignment,
		});
	} catch (error) {
		return handleControllerError(res, "Assign farmer failed", error, {
			userId: req.user && req.user.id,
			body: req.body,
		});
	}
};

const getAgentFarmers = async (req, res) => {
	try {
		const farmers = await agentService.getFarmers({
			actor: req.user,
			agent_id: req.query && req.query.agent_id,
		});

		return res.status(200).json({
			farmers,
		});
	} catch (error) {
		return handleControllerError(res, "Get agent farmers failed", error, {
			userId: req.user && req.user.id,
			query: req.query,
		});
	}
};

const addProductByAgent = async (req, res) => {
	try {
		const product = await agentService.addProductForFarmer({
			actor: req.user,
			payload: req.body || {},
		});

		return res.status(201).json({
			message: "Product added for farmer successfully",
			product,
		});
	} catch (error) {
		return handleControllerError(res, "Agent add product failed", error, {
			userId: req.user && req.user.id,
			body: req.body,
		});
	}
};

module.exports = {
	addProductByAgent,
	assignFarmer,
	getAgentFarmers,
};