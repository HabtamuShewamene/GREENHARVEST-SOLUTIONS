// Payment controller delegates business logic to the payment service.
const logger = require("../utils/logger");
const paymentService = require("../services/paymentService");

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

const processPayment = async (req, res) => {
  try {
    const payment = await paymentService.processPayment({
      userId: req.user.id,
      ...req.body,
    });

    return res.status(201).json({
      message: "Payment processed successfully",
      payment,
    });
  } catch (error) {
    return handleControllerError(res, "Process payment failed", error, {
      userId: req.user && req.user.id,
      body: req.body,
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user.id);

    return res.status(200).json({
      payments,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch payment history failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

module.exports = {
  processPayment,
  getPaymentHistory,
};
