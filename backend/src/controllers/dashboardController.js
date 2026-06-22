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

    const [productSummary, inventoryBreakdown, orderSummary, recentOrders, categoryBreakdown, weeklySales, lowStockItems, pendingShipments, trendingKeywords, priceBenchmark] = await Promise.all([
      pool.query(
        `
          SELECT
            COUNT(p.id)::int AS total_products,
            COALESCE(SUM(COALESCE(i.quantity, 0)), 0)::int AS total_stock_units,
            COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) = 0)::int AS out_of_stock_products,
            COUNT(*) FILTER (WHERE COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= 10)::int AS low_stock_products
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id
          WHERE p.farmer_id = $1
        `,
        [farmerId]
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.name,
            COALESCE(i.quantity, 0) AS stock,
            p.price,
            NULL::text AS farm_location,
            p.created_at,
            p.category_id,
            c.name AS category_name
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.farmer_id = $1
          ORDER BY p.created_at DESC
        `,
        [farmerId]
      ),
      pool.query(
        `
          SELECT
            COUNT(DISTINCT oi.order_id)::int AS total_orders_received,
            COALESCE(SUM(oi.quantity * oi.price) FILTER (WHERE COALESCE(pay.payment_status, 'pending') = 'paid' AND o.order_status != 'cancelled'), 0)::numeric(10,2) AS revenue_earned,
            COUNT(DISTINCT oi.order_id) FILTER (WHERE o.order_status = 'pending')::int AS pending_orders,
            COUNT(DISTINCT oi.order_id) FILTER (WHERE o.order_status = 'confirmed')::int AS confirmed_orders,
            COUNT(DISTINCT oi.order_id) FILTER (WHERE o.order_status = 'in_transit')::int AS in_transit_orders,
            COUNT(DISTINCT oi.order_id) FILTER (WHERE o.order_status = 'delivered')::int AS delivered_orders,
            COALESCE(SUM(oi.quantity * oi.price) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE), 0)::numeric(10,2) AS today_revenue,
            COUNT(DISTINCT oi.order_id) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE)::int AS today_orders
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          LEFT JOIN payments pay ON pay.order_id = o.id
          WHERE p.farmer_id = $1
        `,
        [farmerId]
      ),
      // Recent orders with buyer info and product details
      pool.query(
        `
          SELECT
            o.id AS order_id,
            o.order_status,
            o.total_amount,
            o.created_at,
            u.name AS buyer_name,
            u.email AS buyer_email,
            u.address AS buyer_location,
            json_agg(json_build_object(
              'product_name', p.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'image_url', p.image_url
            )) AS items
          FROM orders o
          JOIN users u ON u.id = o.buyer_id
          JOIN order_items oi ON oi.order_id = o.id
          JOIN products p ON p.id = oi.product_id
          WHERE p.farmer_id = $1
          GROUP BY o.id, u.id
          ORDER BY o.created_at DESC
          LIMIT 10
        `,
        [farmerId]
      ),
      // Top selling categories
      pool.query(
        `
          SELECT
            c.name AS category_name,
            COALESCE(SUM(oi.quantity), 0)::int AS units_sold
          FROM products p
          JOIN categories c ON c.id = p.category_id
          LEFT JOIN order_items oi ON oi.product_id = p.id
          WHERE p.farmer_id = $1
          GROUP BY c.id
          ORDER BY units_sold DESC
          LIMIT 5
        `,
        [farmerId]
      ),
      // Weekly sales trend (last 7 days)
      pool.query(
        `
          SELECT
            d.day::date AS date,
            COALESCE(SUM(fs.quantity * fs.price), 0)::numeric(10,2) AS revenue,
            COUNT(DISTINCT fs.order_id)::int AS orders
          FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
          LEFT JOIN (
            SELECT o.id AS order_id, DATE(o.created_at) AS order_date, oi.quantity, oi.price
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN products p ON p.id = oi.product_id
            WHERE p.farmer_id = $1
          ) AS fs ON fs.order_date = d.day::date
          GROUP BY d.day
          ORDER BY d.day ASC
        `,
        [farmerId]
      ),
      // Low stock items (<=10 units)
      pool.query(
        `
          SELECT
            p.id,
            p.name,
            COALESCE(i.quantity, 0)::int AS stock,
            p.price
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id
          WHERE p.farmer_id = $1 AND COALESCE(i.quantity, 0) <= 10
          ORDER BY COALESCE(i.quantity, 0) ASC
          LIMIT 10
        `,
        [farmerId]
      ),
      // Pending shipments
      pool.query(
        `
          SELECT
            o.id AS order_id,
            o.order_status,
            o.total_amount,
            o.created_at,
            u.name AS buyer_name
          FROM orders o
          JOIN users u ON u.id = o.buyer_id
          JOIN order_items oi ON oi.order_id = o.id
          JOIN products p ON p.id = oi.product_id
          WHERE p.farmer_id = $1 AND o.order_status IN ('pending', 'confirmed')
          GROUP BY o.id, u.id
          ORDER BY o.created_at ASC
          LIMIT 5
        `,
        [farmerId]
      ),
      // Trending keywords (top products on platform)
      pool.query(
        `
          SELECT p.name, SUM(oi.quantity)::int AS total_sold
          FROM products p
          JOIN order_items oi ON oi.product_id = p.id
          JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY p.id
          ORDER BY total_sold DESC
          LIMIT 3
        `
      ),
      // Price benchmark (compare farmer's product to category average)
      pool.query(
        `
          WITH farmer_top_product AS (
            SELECT p.id, p.name, p.price, p.category_id
            FROM products p
            WHERE p.farmer_id = $1
            ORDER BY p.id DESC
            LIMIT 1
          )
          SELECT 
            ftp.name AS product_name, 
            ftp.price::numeric AS my_price, 
            c.name AS category_name,
            (SELECT AVG(price)::numeric(10,2) FROM products WHERE category_id = ftp.category_id) AS avg_category_price
          FROM farmer_top_product ftp
          JOIN categories c ON c.id = ftp.category_id
        `,
        [farmerId]
      )
    ]);

    return res.status(200).json({
      summary: {
        ...productSummary.rows[0],
        ...orderSummary.rows[0],
      },
      inventory: inventoryBreakdown.rows,
      recent_orders: recentOrders.rows,
      category_breakdown: categoryBreakdown.rows,
      weekly_sales: weeklySales.rows,
      low_stock_items: lowStockItems.rows,
      pending_shipments: pendingShipments.rows,
      market_insights: {
        trending_keywords: trendingKeywords.rows,
        price_benchmark: priceBenchmark.rows[0] || null
      }
    });
  } catch (error) {
    console.error("Fetch farmer dashboard failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Farmer-specific orders endpoint
const getFarmerOrders = async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can access their orders",
      });
    }

    const farmerId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    const search = req.query.search || null;

    let statusFilter = "";
    const values = [farmerId];
    let paramIdx = 2;

    if (status && status !== "all") {
      statusFilter = ` AND o.order_status = $${paramIdx}`;
      values.push(status);
      paramIdx++;
    }

    let searchFilter = "";
    if (search) {
      searchFilter = ` AND (CAST(o.id AS TEXT) LIKE $${paramIdx} OR u.name ILIKE $${paramIdx + 1})`;
      values.push(`%${search}%`, `%${search}%`);
      paramIdx += 2;
    }

    const countResult = await pool.query(
      `
        SELECT COUNT(DISTINCT o.id)::int AS total
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        JOIN users u ON u.id = o.buyer_id
        WHERE p.farmer_id = $1${statusFilter}${searchFilter}
      `,
      values
    );

    const total = countResult.rows[0].total;

    values.push(limit, offset);
    const ordersResult = await pool.query(
      `
        SELECT
          o.id AS order_id,
          o.order_status,
          o.total_amount,
          o.created_at,
          u.name AS buyer_name,
          u.email AS buyer_email,
          json_agg(json_build_object(
            'product_name', p.name,
            'quantity', oi.quantity,
            'price', oi.price,
            'category_name', c.name,
            'image_url', p.image_url
          )) AS items
        FROM orders o
        JOIN users u ON u.id = o.buyer_id
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.farmer_id = $1${statusFilter}${searchFilter}
        GROUP BY o.id, u.id
        ORDER BY o.created_at DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `,
      values
    );

    return res.status(200).json({
      orders: ordersResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch farmer orders failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Farmer products endpoint
const getFarmerProducts = async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({
        message: "Only farmers can access their products",
      });
    }

    const farmerId = req.user.id;

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          COALESCE(i.quantity, 0)::int AS stock,
          p.image_url,
          p.created_at,
          c.name AS category_name,
          c.id AS category_id,
          COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
          COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(10,2) AS revenue
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        WHERE p.farmer_id = $1
        GROUP BY p.id, i.quantity, c.name, c.id
        ORDER BY p.created_at DESC
      `,
      [farmerId]
    );

    return res.status(200).json({
      products: result.rows,
    });
  } catch (error) {
    console.error("Fetch farmer products failed:", error.message);
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
              LEFT JOIN payments p ON p.order_id = o.id
            ) AS total_revenue
        `
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.name,
            p.price,
            COALESCE(i.quantity, 0) AS stock,
            p.farmer_id,
            u.name AS farmer_name,
            COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
            COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(10,2) AS revenue_generated
          FROM products p
          JOIN users u ON u.id = p.farmer_id
          LEFT JOIN inventory i ON i.product_id = p.id
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id
          WHERE o.id IS NULL OR o.order_status != 'cancelled'
          GROUP BY p.id, u.id, i.quantity
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
  getFarmerOrders,
  getFarmerProducts,
  getAdminDashboard,
};
