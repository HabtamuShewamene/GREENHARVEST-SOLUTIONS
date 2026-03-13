const { pool } = require("../config/db");

const getSummaryMetrics = async () => {
	const result = await pool.query(
		`
			SELECT
				(SELECT COUNT(*)::int FROM users) AS total_users,
				(
					SELECT COUNT(*)::int
					FROM users u
					JOIN roles r ON r.role_id = u.role_id
					WHERE r.role_name = 'farmer'
				) AS total_farmers,
				(SELECT COUNT(*)::int FROM orders) AS total_orders,
				(
					SELECT COALESCE(SUM(COALESCE(total_amount, total_price)) FILTER (WHERE payment_status = 'paid' AND order_status != 'cancelled'), 0)::numeric(10,2)
					FROM orders
				) AS total_revenue
		`
	);

	return result.rows[0];
};

const getTopSellingProducts = async (limit = 10) => {
	const result = await pool.query(
		`
			SELECT
				p.id,
				p.name,
				COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
				COALESCE(SUM(oi.quantity * oi.price), 0)::numeric(10,2) AS revenue_generated
			FROM products p
			LEFT JOIN order_items oi ON oi.product_id = p.id
			LEFT JOIN orders o ON o.id = oi.order_id
			WHERE o.id IS NULL OR o.order_status != 'cancelled'
			GROUP BY p.id
			ORDER BY units_sold DESC, revenue_generated DESC, p.created_at DESC
			LIMIT $1
		`,
		[limit]
	);

	return result.rows;
};

module.exports = {
	getSummaryMetrics,
	getTopSellingProducts,
};