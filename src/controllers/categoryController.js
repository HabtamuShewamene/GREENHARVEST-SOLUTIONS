const logger = require("../utils/logger");
const categoryService = require("../services/categoryService");

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

const createCategory = async (req, res) => {
	try {
		if (!req.body || typeof req.body !== "object") {
			return res.status(400).json({
				message: "Request body must be valid JSON",
			});
		}

		const category = await categoryService.createCategory(req.body);

		return res.status(201).json({
			message: "Category created successfully",
			category,
		});
	} catch (error) {
		return handleControllerError(res, "Create category failed", error, {
			userId: req.user && req.user.id,
			body: req.body,
		});
	}
};

const getAllCategories = async (req, res) => {
	try {
		const categories = await categoryService.getAllCategories();

		return res.status(200).json({
			categories,
		});
	} catch (error) {
		return handleControllerError(res, "Fetch categories failed", error);
	}
};

const getCategoryById = async (req, res) => {
	try {
		const category = await categoryService.getCategoryById(req.params.id);

		return res.status(200).json({
			category,
		});
	} catch (error) {
		return handleControllerError(res, "Fetch category failed", error, {
			categoryId: req.params.id,
		});
	}
};

module.exports = {
	createCategory,
	getAllCategories,
	getCategoryById,
};
