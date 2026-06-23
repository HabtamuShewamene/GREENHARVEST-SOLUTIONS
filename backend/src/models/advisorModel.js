const { pool } = require("../config/db");

const getAdvisorData = async (farmer_id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure we have some default market benchmarks
    let benchmarks = await client.query("SELECT * FROM market_benchmarks LIMIT 5");
    if (benchmarks.rows.length === 0) {
      await client.query(`
        INSERT INTO market_benchmarks (product_name, category, market_avg_price, trend_label, region) VALUES 
        ('Brown Teff (Qt)', 'Grains', 8100.00, 'Under Market', 'Addis Ababa Hub'),
        ('Arabica Coffee (Kg)', 'Beverages', 405.00, 'Premium Peak', 'Addis Ababa Hub')
      `);
      benchmarks = await client.query("SELECT * FROM market_benchmarks LIMIT 5");
    }

    // Ensure we have some actionable insights for this farmer
    let insights = await client.query("SELECT * FROM actionable_insights WHERE farmer_id = $1 LIMIT 5", [farmer_id]);
    if (insights.rows.length === 0) {
      await client.query(`
        INSERT INTO actionable_insights (farmer_id, asset_name, asset_category, demand_level, supply_gap_percentage, action_type) VALUES 
        ($1, 'Organic Garlic', 'HERBS', 'EXTREME', 80, 'REVIEW'),
        ($1, 'Highland Lentils', 'LEGUMES', 'HIGH', 40, 'REVIEW')
      `, [farmer_id]);
      insights = await client.query("SELECT * FROM actionable_insights WHERE farmer_id = $1 LIMIT 5", [farmer_id]);
    }

    // Ensure we have AI strategic insights for this farmer
    let aiInsight = await client.query("SELECT * FROM ai_strategic_insights WHERE farmer_id = $1 AND is_active = true LIMIT 1", [farmer_id]);
    if (aiInsight.rows.length === 0) {
      await client.query(`
        INSERT INTO ai_strategic_insights (farmer_id, insight_text, highlight_word, highlight_metric) VALUES 
        ($1, 'Regional demand for Organic Garlic is up 22% in Addis Ababa. Consider adjusting harvest timing for maximum ROI.', 'Organic Garlic', '22%')
      `, [farmer_id]);
      aiInsight = await client.query("SELECT * FROM ai_strategic_insights WHERE farmer_id = $1 AND is_active = true LIMIT 1", [farmer_id]);
    }

    await client.query("COMMIT");

    // Fetch orders stats
    const statsQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders
      FROM orders 
      WHERE seller_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    `;
    const statsResult = await pool.query(statsQuery, [farmer_id]);

    // For demonstration, some calculated metrics
    const revenue = parseFloat(statsResult.rows[0].total_revenue) > 0 ? parseFloat(statsResult.rows[0].total_revenue) : 142500; 
    
    return {
      performance: {
        revenue,
        revenue_growth: "+12.4%",
        efficiency: 94.2,
        avg_fulfillment_time: "4.2h",
        satisfaction: 4.8,
        positive_rating_pct: 96
      },
      benchmarks: benchmarks.rows,
      insights: insights.rows,
      ai_insight: aiInsight.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAdvisorData
};
