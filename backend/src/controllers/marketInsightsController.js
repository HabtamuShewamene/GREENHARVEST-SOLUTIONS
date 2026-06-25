const { getMarketAnalytics } = require('../utils/marketAnalytics');
const advisorService = require('../services/advisorService');

exports.getMarketInsights = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const farmerId = req.user.id;

    const [analytics, myProducts] = await Promise.all([
      getMarketAnalytics(months),
      advisorService.getFarmerMarketComparison(farmerId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...analytics,
        my_products_vs_market: myProducts,
      },
    });
  } catch (error) {
    console.error('Error fetching market insights:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
