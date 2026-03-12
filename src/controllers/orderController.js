// Order controller delegates business logic to the order service.
const logger = require("../utils/logger");
const orderService = require("../services/orderService");

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

const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body || {});

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    return handleControllerError(res, "Create order failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersForBuyer(req.user.id);

    return res.status(200).json({
      orders,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch user orders failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderByIdForBuyer(req.user.id, req.params.id);

    return res.status(200).json({
      order,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch order failed", error, {
      userId: req.user && req.user.id,
      orderId: req.params.id,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await orderService.updateOrderStatus({
      adminUser: req.user,
      orderId: req.params.id,
      ...req.body,
    });

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    return handleControllerError(res, "Update order status failed", error, {
      userId: req.user && req.user.id,
      orderId: req.params.id,
      body: req.body,
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
};
