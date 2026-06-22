const adminModel = require("../models/adminModel");

const getDashboardAnalytics = async () => {
	const [summary, topSellingProducts] = await Promise.all([
		adminModel.getSummaryMetrics(),
		adminModel.getTopSellingProducts(10),
	]);

	return {
		total_users: summary.total_users,
		total_farmers: summary.total_farmers,
		total_orders: summary.total_orders,
		total_revenue: summary.total_revenue,
		top_selling_products: topSellingProducts,
	};
};

module.exports = {
	getDashboardAnalytics,
};