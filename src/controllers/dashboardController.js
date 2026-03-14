// Moved from controllers/dashboardController.js during the structure refactor.
// Import path updated to use src/config/db.js.
const { pool } = require("../config/db");

const getFarmerDashboard = async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can access this dashboard",
      });
    }

    const farmerId = req.user.id;

    const [productSummary, inventoryBreakdown, orderSummary] = await Promise.all([
      pool.query(
        `
          SELECT
            COUNT(p.product_id)::int AS total_products,
            COALESCE(SUM(COALESCE(i.quantity, 0)), 0)::int AS total_stock_units,
            COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) = 0)::int AS out_of_stock_products,
            COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= 10)::int AS low_stock_products
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.product_id
          WHERE p.farmer_id = $1
        `,
        [farmerId]
      ),
      pool.query(
        `
          SELECT
            p.product_id AS id,
            p.name,
            COALESCE(i.quantity, 0) AS stock,
            p.price,
            NULL::text AS farm_location,
            p.created_at
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.product_id
          WHERE p.farmer_id = $1
          ORDER BY p.created_at DESC
        `,
        [farmerId]
      ),
      pool.query(
        `
          SELECT
            COUNT(DISTINCT oi.order_id)::int AS total_orders_received,
            COALESCE(SUM(oi.quantity * oi.price) FILTER (WHERE COALESCE(pay.payment_status, 'pending') = 'paid' AND o.order_status != 'cancelled'), 0)::numeric(10,2) AS revenue_earned
          FROM order_items oi
          JOIN orders o ON o.order_id = oi.order_id
          JOIN products p ON p.product_id = oi.product_id
          LEFT JOIN payments pay ON pay.order_id = o.order_id
          WHERE p.farmer_id = $1
        `,
        [farmerId]
      ),
    ]);

    return res.status(200).json({
      summary: {
        ...productSummary.rows[0],
        ...orderSummary.rows[0],
      },
      inventory: inventoryBreakdown.rows,
    });
  } catch (error) {
    console.error("Fetch farmer dashboard failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can access this dashboard",
      });
    }

    const [userStats, platformStats, topSellingProducts] = await Promise.all([
      pool.query(
        `
          SELECT r.role_name AS role, COUNT(*)::int AS total_users
          FROM users u
          JOIN roles r ON r.role_id = u.role_id
          GROUP BY r.role_name
          ORDER BY r.role_name ASC
        `
      ),
      pool.query(
        `
          SELECT
            (SELECT COUNT(*)::int FROM products) AS total_products,
            (SELECT COUNT(*)::int FROM orders) AS total_orders,
            (
              SELECT COALESCE(SUM(o.total_amount) FILTER (WHERE p.payment_status = 'paid' AND o.order_status != 'cancelled'), 0)::numeric(10,2)
              FROM orders o
              LEFT JOIN payments p ON p.order_id = o.order_id
            ) AS total_revenue
        `
      ),
      pool.query(
        `
          SELECT
            p.product_id AS id,
            p.name,
            p.price,
            COALESCE(i.quantity, 0) AS stock,
            p.farmer_id,
            u.name AS farmer_name,
            COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
            COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(10,2) AS revenue_generated
          FROM products p
          JOIN users u ON u.user_id = p.farmer_id
          LEFT JOIN inventory i ON i.product_id = p.product_id
          LEFT JOIN order_items oi ON oi.product_id = p.product_id
          LEFT JOIN orders o ON o.order_id = oi.order_id
          WHERE o.order_id IS NULL OR o.order_status != 'cancelled'
          GROUP BY p.product_id, u.user_id, i.quantity
          ORDER BY units_sold DESC, revenue_generated DESC, p.created_at DESC
          LIMIT 10
        `
      ),
    ]);

    return res.status(200).json({
      summary: platformStats.rows[0],
      users_by_role: userStats.rows,
      top_selling_products: topSellingProducts.rows,
    });
  } catch (error) {
    console.error("Fetch admin dashboard failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getFarmerDashboard,
  getAdminDashboard,
};
