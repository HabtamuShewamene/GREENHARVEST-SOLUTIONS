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
      user_id: req.user.id,
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
    const history = await paymentService.getPaymentHistory(req.user.id);

    return res.status(200).json({
      ...history,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch payment history failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

// Original exports removed since we redefined them at the bottom

const crypto = require("crypto");
const orderModel = require("../models/orderModel");

const initializeChapaPayment = async (req, res) => {
    try {
        const { order_id, return_url } = req.body;
        
        if (!order_id || !return_url) {
            return res.status(400).json({ message: "order_id and return_url are required" });
        }

        const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
        if (!CHAPA_SECRET_KEY) {
            return res.status(500).json({ message: "Chapa secret key is not configured on the server" });
        }

        const order = await orderModel.findOrderById(Number(order_id));
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        if (order.buyer_id !== req.user.id) {
            return res.status(403).json({ message: "You don't have permission to pay for this order" });
        }

        const tx_ref = `tx-${order_id}-${crypto.randomBytes(8).toString('hex')}`;

        const chapaPayload = {
            amount: order.total_amount,
            currency: "ETB",
            email: req.user.email || "customer@greenharvest.com",
            first_name: req.user.first_name || req.user.name || "Customer",
            last_name: req.user.last_name || "",
            tx_ref: tx_ref,
            callback_url: "https://webhook.site/placeholder",
            return_url: `${return_url}?tx_ref=${tx_ref}&order_id=${order_id}`,
            customization: {
                title: "GreenHarvest Order Payment",
                description: `Payment for order #${order_id}`
            }
        };

        const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${CHAPA_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(chapaPayload)
        });

        const data = await response.json();

        if (data.status !== "success") {
            logger.error("Chapa initialization failed", { data });
            return res.status(400).json({ message: "Failed to initialize payment gateway", details: data });
        }

        return res.status(200).json({
            message: "Payment initialized successfully",
            checkout_url: data.data.checkout_url,
            tx_ref
        });
        
    } catch (error) {
        return handleControllerError(res, "Initialize payment failed", error, {
            userId: req.user && req.user.id,
            body: req.body,
        });
    }
};

const verifyChapaPayment = async (req, res) => {
    try {
        const { tx_ref, order_id } = req.body;
        
        if (!tx_ref || !order_id) {
            return res.status(400).json({ message: "tx_ref and order_id are required" });
        }

        const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
        if (!CHAPA_SECRET_KEY) {
            return res.status(500).json({ message: "Chapa secret key is not configured on the server" });
        }

        const order = await orderModel.findOrderById(Number(order_id));
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.buyer_id !== req.user.id) {
            return res.status(403).json({ message: "You don't have permission to verify this order" });
        }

        const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${CHAPA_SECRET_KEY}`,
            }
        });

        if (!response.ok) {
            logger.error("Chapa verification request failed", { status: response.status, tx_ref });
            return res.status(502).json({ message: "Failed to verify payment with Chapa", status: "failed" });
        }

        const data = await response.json();

        if (data.status === "success" && data.data.status === "success") {
            await orderModel.updateOrderStatusesById(Number(order_id), {
                order_status: null,
                payment_status: 'paid',
                delivery_status: null
            });

            return res.status(200).json({ message: "Payment verified successfully", status: "success" });
        } else {
            return res.status(400).json({ message: "Payment not successful or pending", status: "failed" });
        }
    } catch (error) {
         return handleControllerError(res, "Verify payment failed", error, {
            userId: req.user && req.user.id,
            body: req.body,
        });
    }
}

module.exports = {
  processPayment,
  getPaymentHistory,
  initializeChapaPayment,
  verifyChapaPayment
};
