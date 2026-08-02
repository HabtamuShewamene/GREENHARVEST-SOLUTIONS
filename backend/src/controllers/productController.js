// Product controller delegates business logic to the product service.
const logger = require("../utils/logger");
const productService = require("../services/productService");
const { normalizeRole } = require("../utils/roles");
const { isPositiveInteger } = require("../utils/validators");

const handleControllerError = (res, context, error, meta = {}) => {
  logger.error(context, {
    message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    stack: error.stack,
    ...meta,
  });

  if (error.code === "23503") {
    return res.status(400).json({
      message: "Referenced record does not exist",
      detail: error.detail,
    });
  }

  if (error.code === "22P02") {
    return res.status(400).json({
      message: "Invalid input format",
    });
  }

  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Internal server error",
  });
};

const validateCreateProductRequest = (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({
      message: "Request body must be valid JSON",
    });
    return false;
  }

  const role = normalizeRole(req.user && req.user.role);

  if (!["field_agent", "farmer"].includes(role)) {
    res.status(403).json({
      message: "Only farmers and field agents can create products",
    });
    return false;
  }

  if (role === "field_agent") {
    if (req.body.farmer_id === undefined || req.body.farmer_id === null) {
      res.status(400).json({
        message: "farmer_id is required",
      });
      return false;
    }

    if (!isPositiveInteger(req.body.farmer_id)) {
      res.status(400).json({
        message: "farmer_id must be a valid integer",
      });
      return false;
    }
  }

  return true;
};

const createProduct = async (req, res) => {
  try {
    if (!validateCreateProductRequest(req, res)) {
      return;
    }

    const product = await productService.createProduct({
      user: req.user,
      payload:
        normalizeRole(req.user && req.user.role) === "field_agent"
          ? {
              ...req.body,
              farmer_id: Number(req.body.farmer_id),
            }
          : req.body,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return handleControllerError(res, "Create product failed", error, {
      userId: req.user && req.user.id,
      body: req.body,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        message: "Request body must be valid JSON",
      });
    }

    const product = await productService.updateProduct({
      user: req.user,
      productId: req.params.id,
      payload: req.body,
    });

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return handleControllerError(res, "Update product failed", error, {
      userId: req.user && req.user.id,
      productId: req.params.id,
      body: req.body,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct({
      user: req.user,
      productId: req.params.id,
    });

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    return handleControllerError(res, "Delete product failed", error, {
      userId: req.user && req.user.id,
      productId: req.params.id,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { page, limit, farmer_id, category_id, search, sort } = req.query;
    const result = await productService.getAllProducts({ page, limit, farmer_id, category_id, search, sort });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, "Fetch products failed", error);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);

    return res.status(200).json({
      product,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch product failed", error, {
      productId: req.params.id,
    });
  }
};

const updateProductStock = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        message: "Request body must be valid JSON",
      });
    }

    const product = await productService.updateProductStock({
      user: req.user,
      productId: req.params.id,
      stock: req.body.stock,
    });

    return res.status(200).json({
      message: "Stock updated successfully",
      product,
    });
  } catch (error) {
    return handleControllerError(res, "Update stock failed", error, {
      userId: req.user && req.user.id,
      productId: req.params.id,
      body: req.body,
    });
  }
};

const batchUpdateProductStatus = async (req, res) => {
  try {
    const { pool } = require("../config/db");

    if (!req.user || normalizeRole(req.user.role) !== "farmer") {
      return res
        .status(403)
        .json({ message: "Only farmers can batch update products" });
    }

    const { product_ids, status } = req.body || {};

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res
        .status(400)
        .json({ message: "product_ids must be a non-empty array" });
    }

    const validStatuses = ["active", "draft", "deactivated"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "status must be one of: active, draft, deactivated",
      });
    }

    const farmerId = req.user.id;
    const ids = product_ids
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) {
      return res
        .status(400)
        .json({ message: "product_ids must contain valid integers" });
    }

    const result = await pool.query(
      `UPDATE products SET status = $1 WHERE id = ANY($2::int[]) AND farmer_id = $3 RETURNING id`,
      [status, ids, farmerId]
    );

    const updatedIds = result.rows.map((r) => r.id);

    if (updatedIds.length === 0) {
      return res
        .status(403)
        .json({ message: "No products found or not authorized" });
    }

    return res.status(200).json({
      message: `${updatedIds.length} product(s) updated to status "${status}"`,
      affected: updatedIds.length,
      product_ids: updatedIds,
    });
  } catch (error) {
    return handleControllerError(
      res,
      "Batch update product status failed",
      error,
      {
        userId: req.user && req.user.id,
        body: req.body,
      }
    );
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductStock,
  batchUpdateProductStatus,
};
