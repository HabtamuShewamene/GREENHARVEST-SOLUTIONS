// Moved from controllers/searchController.js during the structure refactor.
// Import path updated to use src/config/db.js.
const { pool } = require("../config/db");

const searchProducts = async (req, res) => {
  try {
    const { name, category_id, min_price, max_price, location } = req.query;
    const conditions = [];
    const values = [];

    if (name) {
      values.push(`%${name.trim()}%`);
      conditions.push(`p.name ILIKE $${values.length}`);
    }

    if (category_id !== undefined) {
      const categoryId = Number(category_id);

      if (!Number.isInteger(categoryId)) {
        return res.status(400).json({
          message: "category_id must be an integer",
        });
      }

      values.push(categoryId);
      conditions.push(`p.category_id = $${values.length}`);
    }

    if (min_price !== undefined) {
      const minPrice = Number(min_price);

      if (Number.isNaN(minPrice) || minPrice < 0) {
        return res.status(400).json({
          message: "min_price must be a non-negative number",
        });
      }

      values.push(minPrice);
      conditions.push(`p.price >= $${values.length}`);
    }

    if (max_price !== undefined) {
      const maxPrice = Number(max_price);

      if (Number.isNaN(maxPrice) || maxPrice < 0) {
        return res.status(400).json({
          message: "max_price must be a non-negative number",
        });
      }

      values.push(maxPrice);
      conditions.push(`p.price <= $${values.length}`);
    }

    if (location) {
      values.push(`%${location.trim()}%`);
      conditions.push(`p.farm_location ILIKE $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.farm_location,
          p.image_url,
          p.created_at,
          p.category_id,
          p.farmer_id,
          u.name AS farmer_name,
          u.email AS farmer_email,
          c.name AS category_name,
          COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating,
          COUNT(r.id)::int AS total_reviews
        FROM products p
        JOIN users u ON u.id = p.farmer_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN reviews r ON r.product_id = p.id
        ${whereClause}
        GROUP BY p.id, u.id, c.id
        ORDER BY p.created_at DESC
      `,
      values
    );

    return res.status(200).json({
      filters: {
        name: name || null,
        category_id: category_id || null,
        min_price: min_price || null,
        max_price: max_price || null,
        location: location || null,
      },
      products: result.rows,
    });
  } catch (error) {
    console.error("Search products failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const result = await pool.query(
      `
        WITH preferred_categories AS (
          SELECT category_id
          FROM (
            SELECT p.category_id, COUNT(*) AS interaction_count
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.buyer_id = $1
              AND p.category_id IS NOT NULL
            GROUP BY p.category_id

            UNION ALL

            SELECT p.category_id, COUNT(*) AS interaction_count
            FROM reviews rv
            JOIN products p ON p.id = rv.product_id
            WHERE rv.user_id = $1
              AND p.category_id IS NOT NULL
            GROUP BY p.category_id
          ) category_interactions
          GROUP BY category_id
          ORDER BY SUM(interaction_count) DESC
          LIMIT 5
        ),
        purchased_products AS (
          SELECT DISTINCT oi.product_id
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.buyer_id = $1
        ),
        popular_products AS (
          SELECT
            p.id,
            COUNT(oi.id) AS popularity_score
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          GROUP BY p.id
        )
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.farm_location,
          p.image_url,
          p.created_at,
          p.category_id,
          p.farmer_id,
          u.name AS farmer_name,
          c.name AS category_name,
          COALESCE(pop.popularity_score, 0)::int AS popularity_score,
          COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating
        FROM products p
        JOIN users u ON u.id = p.farmer_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN reviews r ON r.product_id = p.id
        LEFT JOIN popular_products pop ON pop.id = p.id
        WHERE p.stock > 0
          AND p.id NOT IN (SELECT product_id FROM purchased_products)
          AND (
            p.category_id IN (SELECT category_id FROM preferred_categories)
            OR COALESCE(pop.popularity_score, 0) > 0
          )
        GROUP BY p.id, u.id, c.id, pop.popularity_score
        ORDER BY
          CASE WHEN p.category_id IN (SELECT category_id FROM preferred_categories) THEN 0 ELSE 1 END,
          COALESCE(pop.popularity_score, 0) DESC,
          average_rating DESC,
          p.created_at DESC
        LIMIT 10
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      const fallback = await pool.query(
        `
          SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            p.stock,
            p.farm_location,
            p.image_url,
            p.created_at,
            p.category_id,
            p.farmer_id,
            u.name AS farmer_name,
            c.name AS category_name,
            COUNT(oi.id)::int AS popularity_score,
            COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating
          FROM products p
          JOIN users u ON u.id = p.farmer_id
          LEFT JOIN categories c ON c.id = p.category_id
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN reviews r ON r.product_id = p.id
          WHERE p.stock > 0
          GROUP BY p.id, u.id, c.id
          ORDER BY popularity_score DESC, average_rating DESC, p.created_at DESC
          LIMIT 10
        `
      );

      return res.status(200).json({
        recommendations: fallback.rows,
      });
    }

    return res.status(200).json({
      recommendations: result.rows,
    });
  } catch (error) {
    console.error("Fetch recommendations failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  searchProducts,
  getRecommendations,
};
