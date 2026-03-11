// Moved from controllers/paymentController.js during the structure refactor.
// Import path updated to use src/config/db.js.
const crypto = require("crypto");

const { pool } = require("../config/db");

const allowedPaymentStatuses = ["pending", "paid", "failed", "refunded"];

const buildTransactionId = () => {
  return `txn_${crypto.randomBytes(8).toString("hex")}`;
};

const processPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const { order_id, payment_method, amount } = req.body;
    const orderId = Number(order_id);
    const paymentAmount = Number(amount);

    if (!Number.isInteger(orderId) || !payment_method || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        message: "order_id, payment_method, and a valid amount are required",
      });
    }

    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT id, buyer_id, total_price, payment_status
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    if (order.buyer_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You can only pay for your own orders",
      });
    }

    if (order.payment_status === "paid") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Order has already been paid",
      });
    }

    if (Number(order.total_price) !== paymentAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Payment amount does not match order total",
      });
    }

    const transactionId = buildTransactionId();
    const paymentStatus = "paid";

    const paymentResult = await client.query(
      `
        INSERT INTO payments (order_id, payment_method, amount, payment_status, transaction_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, order_id, payment_method, amount, payment_status, transaction_id, created_at
      `,
      [orderId, payment_method.trim(), paymentAmount.toFixed(2), paymentStatus, transactionId]
    );

    await client.query(
      `
        UPDATE orders
        SET payment_status = $1,
            order_status = CASE WHEN order_status = 'pending' THEN 'confirmed' ELSE order_status END
        WHERE id = $2
      `,
      [paymentStatus, orderId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Payment processed successfully",
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Process payment failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.order_id,
          p.payment_method,
          p.amount,
          p.payment_status,
          p.transaction_id,
          p.created_at,
          o.order_status,
          o.delivery_status,
          o.total_price
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE o.buyer_id = $1
        ORDER BY p.created_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      payments: result.rows,
    });
  } catch (error) {
    console.error("Fetch payment history failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  allowedPaymentStatuses,
  processPayment,
  getPaymentHistory,
};
