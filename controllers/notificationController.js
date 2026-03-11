const { pool } = require("../config/db");

const createNotification = async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create notifications",
      });
    }

    const { message, user_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "message is required",
      });
    }

    await client.query("BEGIN");

    if (user_id !== undefined && user_id !== null) {
      const targetUserId = Number(user_id);

      if (!Number.isInteger(targetUserId)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "user_id must be a valid integer",
        });
      }

      const userResult = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [targetUserId]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          message: "User not found",
        });
      }

      const result = await client.query(
        `
          INSERT INTO notifications (user_id, message)
          VALUES ($1, $2)
          RETURNING id, user_id, message, status, created_at
        `,
        [targetUserId, message.trim()]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Notification created successfully",
        notification: result.rows[0],
      });
    }

    const insertResult = await client.query(
      `
        INSERT INTO notifications (user_id, message)
        SELECT id, $1
        FROM users
        RETURNING id, user_id, message, status, created_at
      `,
      [message.trim()]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Notifications created successfully",
      count: insertResult.rows.length,
      notifications: insertResult.rows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create notification failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, user_id, message, status, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      notifications: result.rows,
    });
  } catch (error) {
    console.error("Fetch notifications failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId)) {
      return res.status(400).json({
        message: "Invalid notification id",
      });
    }

    const result = await pool.query(
      `
        UPDATE notifications
        SET status = 'read'
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, message, status, created_at
      `,
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Mark notification as read failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
};