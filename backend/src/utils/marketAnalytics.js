const { pool } = require('../config/db');

const COMMODITY_ICONS = {
  'Teff (Grade A)': 'grass',
  Teff: 'grass',
  'Coffee (Arabica)': 'coffee',
  Coffee: 'coffee',
  Wheat: 'local_florist',
  Maize: 'spa',
};

function shortName(commodityName) {
  return commodityName.split('(')[0].trim();
}

function computeTrending(priceTrends) {
  const trending = [];

  for (const [commodity, entries] of Object.entries(priceTrends)) {
    if (entries.length < 2) continue;

    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const oldest = sorted[0].price;
    const latest = sorted[sorted.length - 1].price;
    if (!oldest) continue;

    const changePct = ((latest - oldest) / oldest) * 100;
    trending.push({
      name: shortName(commodity),
      commodity,
      change_pct: Math.round(changePct * 10) / 10,
      up: changePct >= 0,
      icon: COMMODITY_ICONS[commodity] || COMMODITY_ICONS[shortName(commodity)] || 'trending_up',
    });
  }

  return trending.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
}

function computeSupplyForecast(priceTrends) {
  const forecast = [];

  for (const [commodity, entries] of Object.entries(priceTrends)) {
    if (entries.length < 2) continue;

    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const prices = sorted.map((e) => e.price);
    const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;
    const latest = prices[prices.length - 1];
    const momentum = avgPrice > 0 ? (latest / avgPrice) * 100 : 50;

    const currentYield = Math.min(Math.round(momentum * 0.85), 100);
    const forecastYield = Math.min(Math.round(momentum * 0.95), 100);

    let status = 'Moderate';
    if (forecastYield >= 80) status = 'High';
    else if (forecastYield < 55) status = 'Low';

    forecast.push({
      commodity: shortName(commodity),
      current_yield: currentYield,
      forecast_yield: forecastYield,
      status,
    });
  }

  return forecast.slice(0, 5);
}

async function fetchCommodityRows(months = 6) {
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - months);

  const result = await pool.query(
    `SELECT commodity_name, price, region, recorded_at
     FROM commodity_price_history
     WHERE recorded_at >= $1
     ORDER BY recorded_at ASC`,
    [sinceDate.toISOString()]
  );

  return result.rows;
}

function buildPriceTrends(rows) {
  const priceTrends = {};
  for (const row of rows) {
    const { commodity_name, price, recorded_at } = row;
    if (!priceTrends[commodity_name]) priceTrends[commodity_name] = [];
    priceTrends[commodity_name].push({
      price: parseFloat(price),
      date: recorded_at,
    });
  }
  return priceTrends;
}

function computeRegionalDemand(rows) {
  const regionalPrices = {};

  for (const row of rows) {
    if (!row.region) continue;
    if (!regionalPrices[row.region]) regionalPrices[row.region] = [];
    regionalPrices[row.region].push(parseFloat(row.price));
  }

  const maxRegionalAvg = Math.max(
    ...Object.values(regionalPrices).map(
      (prices) => prices.reduce((s, p) => s + p, 0) / prices.length
    ),
    1
  );

  return Object.entries(regionalPrices)
    .map(([region, prices]) => {
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      const demandIndex = Math.round((avg / maxRegionalAvg) * 100);
      let status = 'Moderate';
      if (demandIndex >= 85) status = 'High Demand';
      else if (demandIndex < 60) status = 'Oversaturated';

      return {
        region,
        demand_index: demandIndex,
        avg_price: Math.round(avg),
        status,
      };
    })
    .sort((a, b) => b.demand_index - a.demand_index);
}

async function getMarketAnalytics(months = 6) {
  const rows = await fetchCommodityRows(months);
  const priceTrends = buildPriceTrends(rows);

  const lastUpdatedResult = await pool.query(
    `SELECT MAX(recorded_at) AS last_updated FROM commodity_price_history`
  );

  return {
    price_trends: priceTrends,
    trending: computeTrending(priceTrends),
    regional_demand: computeRegionalDemand(rows),
    supply_forecast: computeSupplyForecast(priceTrends),
    last_updated: lastUpdatedResult.rows[0]?.last_updated || new Date().toISOString(),
  };
}

function generateAiInsight(insights, regionalDemand, trending) {
  if (insights.length > 0) {
    const top = insights[0];
    const action =
      top.action_type === 'RESTOCK'
        ? 'restocking inventory to meet demand'
        : top.action_type === 'LOWER PRICE'
          ? 'lowering your price to stay competitive'
          : 'reviewing your listing strategy';
    return {
      insight_text: `Demand for ${top.asset_name} is ${top.demand_level.toLowerCase()} with a ${top.supply_gap_percentage}% supply gap. Consider ${action}.`,
      highlight_word: top.asset_name,
      highlight_metric: `${top.supply_gap_percentage}% gap`,
    };
  }

  if (trending.length > 0) {
    const top = trending[0];
    return {
      insight_text: `${top.name} prices are ${top.up ? 'rising' : 'falling'} (${top.up ? '+' : ''}${top.change_pct}%). Adjust harvest timing and pricing to maximize ROI.`,
      highlight_word: top.name,
      highlight_metric: `${top.up ? '+' : ''}${top.change_pct}%`,
    };
  }

  if (regionalDemand.length > 0) {
    const top = regionalDemand[0];
    return {
      insight_text: `Strongest regional demand is in ${top.region} (index ${top.demand_index}). Target marketing and fulfillment toward this hub.`,
      highlight_word: top.region,
      highlight_metric: `index ${top.demand_index}`,
    };
  }

  return {
    insight_text: 'Add products and complete orders to unlock personalized growth recommendations.',
    highlight_word: null,
    highlight_metric: null,
  };
}

module.exports = {
  getMarketAnalytics,
  computeRegionalDemand,
  computeTrending,
  generateAiInsight,
  shortName,
};
