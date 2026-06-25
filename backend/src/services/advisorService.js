const { pool } = require('../config/db');
const { getMarketAnalytics, generateAiInsight } = require('../utils/marketAnalytics');

async function getPerformanceMetrics(farmerId) {
  const revenueResult = await pool.query(
    `
      SELECT
        COALESCE(SUM(oi.quantity * oi.price) FILTER (
          WHERE o.created_at >= NOW() - INTERVAL '30 days'
            AND o.order_status NOT IN ('cancelled')
        ), 0)::numeric(12,2) AS revenue_30d,
        COALESCE(SUM(oi.quantity * oi.price) FILTER (
          WHERE o.created_at >= NOW() - INTERVAL '60 days'
            AND o.created_at < NOW() - INTERVAL '30 days'
            AND o.order_status NOT IN ('cancelled')
        ), 0)::numeric(12,2) AS revenue_prev_30d
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.farmer_id = $1
    `,
    [farmerId]
  );

  const fulfillmentResult = await pool.query(
    `
      SELECT
        COUNT(DISTINCT o.id) FILTER (WHERE o.order_status = 'delivered')::int AS delivered,
        COUNT(DISTINCT o.id) FILTER (WHERE o.order_status NOT IN ('cancelled'))::int AS total_orders
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.farmer_id = $1
        AND o.created_at >= NOW() - INTERVAL '30 days'
    `,
    [farmerId]
  );

  const reviewsResult = await pool.query(
    `
      SELECT
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        ROUND(
          COUNT(*) FILTER (WHERE r.rating >= 4) * 100.0 / NULLIF(COUNT(*), 0),
          0
        ) AS positive_pct
      FROM reviews r
      JOIN products p ON p.id = r.product_id
      WHERE p.farmer_id = $1
    `,
    [farmerId]
  );

  const revenue = parseFloat(revenueResult.rows[0]?.revenue_30d || 0);
  const revenuePrev = parseFloat(revenueResult.rows[0]?.revenue_prev_30d || 0);
  let revenueGrowth = '0%';
  if (revenuePrev > 0) {
    const pct = ((revenue - revenuePrev) / revenuePrev) * 100;
    revenueGrowth = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  } else if (revenue > 0) {
    revenueGrowth = '+100%';
  }

  const delivered = fulfillmentResult.rows[0]?.delivered || 0;
  const totalOrders = fulfillmentResult.rows[0]?.total_orders || 0;
  const efficiency = totalOrders > 0 ? Math.round((delivered / totalOrders) * 1000) / 10 : 0;

  const avgRating = parseFloat(reviewsResult.rows[0]?.avg_rating || 0);
  const positivePct = parseInt(reviewsResult.rows[0]?.positive_pct || 0, 10);

  return {
    revenue,
    revenue_growth: revenueGrowth,
    efficiency,
    avg_fulfillment_time: totalOrders > 0 ? `${Math.max(1, Math.round(24 / Math.max(delivered, 1)))}h` : '—',
    satisfaction: avgRating || 0,
    positive_rating_pct: positivePct,
  };
}

async function getPricingBenchmarks(farmerId) {
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.name AS product_name,
        c.name AS category,
        p.price::numeric(10,2) AS farmer_price,
        cat_avg.avg_price::numeric(10,2) AS category_avg_price,
        cp.commodity_price::numeric(10,2) AS commodity_market_price,
        cp.commodity_name,
        COALESCE(cp.commodity_price, cat_avg.avg_price)::numeric(10,2) AS market_avg_price,
        CASE
          WHEN COALESCE(cp.commodity_price, cat_avg.avg_price) IS NULL THEN 'No Benchmark'
          WHEN p.price > COALESCE(cp.commodity_price, cat_avg.avg_price) * 1.05 THEN 'Over Market'
          WHEN p.price < COALESCE(cp.commodity_price, cat_avg.avg_price) * 0.95 THEN 'Under Market'
          ELSE 'At Market'
        END AS trend_label,
        COALESCE(cp.region, 'Addis Ababa') AS region
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT AVG(price)::numeric(10,2) AS avg_price
        FROM products
        WHERE category_id = p.category_id
      ) cat_avg ON TRUE
      LEFT JOIN LATERAL (
        SELECT price AS commodity_price, commodity_name, region
        FROM commodity_price_history
        WHERE LOWER(commodity_name) LIKE '%' || LOWER(SPLIT_PART(p.name, ' ', 1)) || '%'
           OR LOWER(p.name) LIKE '%' || LOWER(SPLIT_PART(commodity_name, ' ', 1)) || '%'
        ORDER BY recorded_at DESC
        LIMIT 1
      ) cp ON TRUE
      WHERE p.farmer_id = $1
      ORDER BY p.created_at DESC
      LIMIT 5
    `,
    [farmerId]
  );

  return result.rows.map((row) => {
    const farmerPrice = parseFloat(row.farmer_price || 0);
    const marketAvg = parseFloat(row.market_avg_price || 0);
    const diffPct =
      marketAvg > 0 ? Math.round(((farmerPrice - marketAvg) / marketAvg) * 1000) / 10 : 0;

    return {
      id: row.id,
      product_name: row.product_name,
      category: row.category,
      farmer_price: farmerPrice,
      market_avg_price: marketAvg,
      category_avg_price: parseFloat(row.category_avg_price || 0),
      commodity_market_price: parseFloat(row.commodity_market_price || 0) || null,
      commodity_name: row.commodity_name,
      trend_label: row.trend_label,
      region: row.region,
      price_diff_pct: diffPct,
    };
  });
}

async function getActionableInsights(farmerId) {
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.name AS asset_name,
        UPPER(COALESCE(c.name, 'GENERAL')) AS asset_category,
        COALESCE(SUM(oi.quantity) FILTER (
          WHERE o.created_at >= NOW() - INTERVAL '30 days'
            AND o.order_status NOT IN ('cancelled')
        ), 0)::int AS units_sold_30d,
        COALESCE(i.quantity, p.stock, 0)::int AS current_stock,
        p.price::numeric(10,2) AS farmer_price,
        COALESCE(cp.commodity_price, cat_avg.avg_price)::numeric(10,2) AS category_avg_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
      LEFT JOIN LATERAL (
        SELECT AVG(price)::numeric(10,2) AS avg_price
        FROM products
        WHERE category_id = p.category_id
      ) cat_avg ON TRUE
      LEFT JOIN LATERAL (
        SELECT price AS commodity_price
        FROM commodity_price_history
        WHERE LOWER(commodity_name) LIKE '%' || LOWER(SPLIT_PART(p.name, ' ', 1)) || '%'
           OR LOWER(p.name) LIKE '%' || LOWER(SPLIT_PART(commodity_name, ' ', 1)) || '%'
        ORDER BY recorded_at DESC
        LIMIT 1
      ) cp ON TRUE
      WHERE p.farmer_id = $1
      GROUP BY p.id, c.name, i.quantity, cat_avg.avg_price, cp.commodity_price
      ORDER BY units_sold_30d DESC, p.created_at DESC
      LIMIT 5
    `,
    [farmerId]
  );

  return result.rows.map((row) => {
    const unitsSold = row.units_sold_30d || 0;
    const stock = row.current_stock || 0;
    const farmerPrice = parseFloat(row.farmer_price || 0);
    const categoryAvg = parseFloat(row.category_avg_price || 0);

    let demandLevel = 'LOW';
    if (unitsSold > 50) demandLevel = 'EXTREME';
    else if (unitsSold > 20) demandLevel = 'HIGH';
    else if (unitsSold > 5) demandLevel = 'MODERATE';

    let supplyGap = 0;
    if (stock === 0 && unitsSold > 0) supplyGap = 90;
    else if (unitsSold > stock * 2) supplyGap = 75;
    else if (unitsSold > stock) supplyGap = 55;
    else if (farmerPrice > categoryAvg * 1.1 && categoryAvg > 0) supplyGap = 40;
    else supplyGap = Math.max(10, Math.min(30, unitsSold * 3));

    let actionType = 'REVIEW';
    if (stock === 0 && unitsSold > 0) actionType = 'RESTOCK';
    else if (farmerPrice > categoryAvg * 1.05 && categoryAvg > 0) actionType = 'LOWER PRICE';
    else if (unitsSold === 0) actionType = 'PROMOTE';

    return {
      id: row.id,
      asset_name: row.asset_name,
      asset_category: row.asset_category,
      demand_level: demandLevel,
      supply_gap_percentage: supplyGap,
      action_type: actionType,
      units_sold_30d: unitsSold,
      current_stock: stock,
    };
  });
}

async function getFarmerMarketComparison(farmerId) {
  const result = await pool.query(
    `
      SELECT
        p.id,
        p.name AS product_name,
        p.price::numeric(10,2) AS farmer_price,
        cp.commodity_name,
        cp.price::numeric(10,2) AS market_price,
        cp.region
      FROM products p
      LEFT JOIN LATERAL (
        SELECT commodity_name, price, region
        FROM commodity_price_history
        WHERE LOWER(commodity_name) LIKE '%' || LOWER(SPLIT_PART(p.name, ' ', 1)) || '%'
           OR LOWER(p.name) LIKE '%' || LOWER(SPLIT_PART(commodity_name, ' ', 1)) || '%'
        ORDER BY recorded_at DESC
        LIMIT 1
      ) cp ON TRUE
      WHERE p.farmer_id = $1
      ORDER BY p.created_at DESC
      LIMIT 10
    `,
    [farmerId]
  );

  return result.rows.map((row) => {
    const farmerPrice = parseFloat(row.farmer_price || 0);
    const marketPrice = parseFloat(row.market_price || 0);
    const diffPct =
      marketPrice > 0 ? Math.round(((farmerPrice - marketPrice) / marketPrice) * 1000) / 10 : null;

    return {
      product_name: row.product_name,
      farmer_price: farmerPrice,
      market_price: marketPrice,
      commodity_name: row.commodity_name,
      region: row.region,
      price_diff_pct: diffPct,
    };
  });
}

class AdvisorService {
  async getAdvisorDashboard(farmerId, region = null) {
    const [performance, benchmarks, insights, marketData] = await Promise.all([
      getPerformanceMetrics(farmerId),
      getPricingBenchmarks(farmerId),
      getActionableInsights(farmerId),
      getMarketAnalytics(6),
    ]);

    let regionalDemand = marketData.regional_demand;
    if (region) {
      regionalDemand = regionalDemand.filter((r) => r.region === region);
    }

    const aiInsight = generateAiInsight(insights, regionalDemand, marketData.trending);

    return {
      performance,
      benchmarks,
      insights,
      regional_demand: marketData.regional_demand,
      trending: marketData.trending.slice(0, 5),
      ai_insight: aiInsight,
      selected_region: region || marketData.regional_demand[0]?.region || null,
    };
  }

  async getFarmerMarketComparison(farmerId) {
    return getFarmerMarketComparison(farmerId);
  }
}

module.exports = new AdvisorService();
