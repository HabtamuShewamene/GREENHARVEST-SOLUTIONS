// Order controller delegates business logic to the order service.
const logger = require("../utils/logger");
const deliveryService = require("../services/deliveryService");
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
      actor: req.user,
      order_id: req.params.id,
      status: req.body && (req.body.status || req.body.order_status),
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

const assignDeliveryPartner = async (req, res) => {
  try {
    const order = await deliveryService.assignDeliveryPartnerToOrder({
      actor: req.user,
      order_id: req.params.id,
      delivery_partner_id: req.body && req.body.delivery_partner_id,
    });

    return res.status(200).json({
      message: "Delivery partner assigned successfully",
      order,
    });
  } catch (error) {
    return handleControllerError(res, "Assign delivery partner failed", error, {
      userId: req.user && req.user.id,
      orderId: req.params.id,
      body: req.body,
    });
  }
};

module.exports = {
  assignDeliveryPartner,
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
};
