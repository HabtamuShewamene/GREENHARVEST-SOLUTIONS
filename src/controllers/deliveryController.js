// Moved from controllers/deliveryController.js during the structure refactor.
// Import path updated to use src/config/db.js.
const { pool } = require("../config/db");

const allowedDeliveryStatuses = [
  "pending",
  "assigned",
  "shipped",
  "out for delivery",
  "delivered",
  "cancelled",
];

const assignDeliveryPartner = async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can assign delivery partners",
      });
    }

    const { order_id, delivery_person_id, delivery_address, estimated_time } = req.body;
    const orderId = Number(order_id);
    const deliveryPersonId = Number(delivery_person_id);

    if (!Number.isInteger(orderId) || !Number.isInteger(deliveryPersonId) || !delivery_address) {
      return res.status(400).json({
        message: "order_id, delivery_person_id, and delivery_address are required",
      });
    }

    await client.query("BEGIN");

    const orderResult = await client.query(
      "SELECT id FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const deliveryUserResult = await client.query(
      "SELECT id, role FROM users WHERE id = $1",
      [deliveryPersonId]
    );

    if (deliveryUserResult.rows.length === 0 || deliveryUserResult.rows[0].role !== "delivery") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "delivery_person_id must belong to a delivery partner",
      });
    }

    const existingDelivery = await client.query(
      "SELECT id FROM deliveries WHERE order_id = $1 FOR UPDATE",
      [orderId]
    );

    if (existingDelivery.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Delivery partner already assigned for this order",
      });
    }

    const result = await client.query(
      `
        INSERT INTO deliveries (
          order_id,
          delivery_person_id,
          delivery_address,
          delivery_status,
          estimated_time
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, order_id, delivery_person_id, delivery_address, delivery_status, estimated_time
      `,
      [
        orderId,
        deliveryPersonId,
        delivery_address.trim(),
        "assigned",
        estimated_time || null,
      ]
    );

    await client.query(
      `
        UPDATE orders
        SET delivery_status = $1
        WHERE id = $2
      `,
      ["assigned", orderId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Delivery partner assigned successfully",
      delivery: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Assign delivery partner failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

const updateDeliveryStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const deliveryId = Number(req.params.id);
    const { delivery_status, estimated_time } = req.body;

    if (!Number.isInteger(deliveryId) || !delivery_status) {
      return res.status(400).json({
        message: "Valid delivery id and delivery_status are required",
      });
    }

    if (!allowedDeliveryStatuses.includes(delivery_status)) {
      return res.status(400).json({
        message: "Invalid delivery_status value",
      });
    }

    await client.query("BEGIN");

    const deliveryResult = await client.query(
      `
        SELECT id, order_id, delivery_person_id, delivery_status
        FROM deliveries
        WHERE id = $1
        FOR UPDATE
      `,
      [deliveryId]
    );

    if (deliveryResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Delivery not found",
      });
    }

    const delivery = deliveryResult.rows[0];

    if (
      req.user.role !== "admin" &&
      !(req.user.role === "delivery" && req.user.id === delivery.delivery_person_id)
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You are not allowed to update this delivery",
      });
    }

    const result = await client.query(
      `
        UPDATE deliveries
        SET delivery_status = $1,
            estimated_time = COALESCE($2, estimated_time)
        WHERE id = $3
        RETURNING id, order_id, delivery_person_id, delivery_address, delivery_status, estimated_time
      `,
      [delivery_status, estimated_time || null, deliveryId]
    );

    await client.query(
      `
        UPDATE orders
        SET delivery_status = $1,
            order_status = CASE
              WHEN $1 = 'delivered' THEN 'delivered'
              WHEN $1 IN ('shipped', 'out for delivery') AND order_status = 'confirmed' THEN 'shipped'
              ELSE order_status
            END
        WHERE id = $2
      `,
      [delivery_status, delivery.order_id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Delivery status updated successfully",
      delivery: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update delivery status failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

const trackDelivery = async (req, res) => {
  try {
    const orderId = Number(req.params.order_id);

    if (!Number.isInteger(orderId)) {
      return res.status(400).json({
        message: "Invalid order id",
      });
    }

    const result = await pool.query(
      `
        SELECT
          d.id,
          d.order_id,
          d.delivery_person_id,
          d.delivery_address,
          d.delivery_status,
          d.estimated_time,
          o.buyer_id,
          o.order_status,
          o.payment_status,
          u.name AS delivery_person_name,
          u.email AS delivery_person_email
        FROM deliveries d
        JOIN orders o ON o.id = d.order_id
        LEFT JOIN users u ON u.id = d.delivery_person_id
        WHERE d.order_id = $1
      `,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Delivery not found for this order",
      });
    }

    const delivery = result.rows[0];

    if (
      req.user.role !== "admin" &&
      req.user.id !== delivery.buyer_id &&
      req.user.id !== delivery.delivery_person_id
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this delivery",
      });
    }

    return res.status(200).json({
      delivery,
    });
  } catch (error) {
    console.error("Track delivery failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  assignDeliveryPartner,
  updateDeliveryStatus,
  trackDelivery,
};
