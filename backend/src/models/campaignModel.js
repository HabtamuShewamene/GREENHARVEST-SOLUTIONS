const { pool } = require("../config/db");

const createCampaign = async (campaignData) => {
  const {
    farmer_id,
    name,
    type,
    status = 'scheduled',
    start_date,
    end_date,
    discount_type,
    discount_value,
    voucher_code,
    product_ids = []
  } = campaignData;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertCampaignQuery = `
      INSERT INTO campaigns (farmer_id, name, type, status, start_date, end_date, discount_type, discount_value, voucher_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const campaignResult = await client.query(insertCampaignQuery, [
      farmer_id, name, type, status, start_date, end_date, discount_type, discount_value, voucher_code
    ]);
    const campaign = campaignResult.rows[0];

    if (product_ids.length > 0) {
      const productValues = product_ids.map((id, index) => `($1, $${index + 2})`).join(', ');
      const insertProductsQuery = `
        INSERT INTO campaign_products (campaign_id, product_id)
        VALUES ${productValues};
      `;
      await client.query(insertProductsQuery, [campaign.id, ...product_ids]);
    }

    await client.query("COMMIT");
    return campaign;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getCampaignsByFarmer = async (farmer_id) => {
  const query = `
    SELECT c.*, 
      (SELECT COUNT(*) FROM campaign_products cp WHERE cp.campaign_id = c.id) as products_count
    FROM campaigns c
    WHERE c.farmer_id = $1
    ORDER BY c.created_at DESC;
  `;
  const result = await pool.query(query, [farmer_id]);
  return result.rows;
};

const getCampaignById = async (id, farmer_id) => {
  const query = `
    SELECT * FROM campaigns WHERE id = $1 AND farmer_id = $2;
  `;
  const result = await pool.query(query, [id, farmer_id]);
  const campaign = result.rows[0];
  
  if (campaign) {
    const productsQuery = `
      SELECT p.* FROM products p
      JOIN campaign_products cp ON p.id = cp.product_id
      WHERE cp.campaign_id = $1;
    `;
    const productsResult = await pool.query(productsQuery, [id]);
    campaign.products = productsResult.rows;
  }
  
  return campaign;
};

const updateCampaignStatus = async (id, farmer_id, status) => {
  const query = `
    UPDATE campaigns
    SET status = $1
    WHERE id = $2 AND farmer_id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [status, id, farmer_id]);
  return result.rows[0];
};

const deleteCampaign = async (id, farmer_id) => {
  const query = `
    DELETE FROM campaigns
    WHERE id = $1 AND farmer_id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [id, farmer_id]);
  return result.rows[0];
};

const getMarketingStats = async (farmer_id) => {
  const query = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'running') as active_campaigns,
      COALESCE(SUM(revenue_generated), 0) as promo_revenue,
      COALESCE(SUM(reach), 0) as total_reach,
      COALESCE(SUM((reach * conversion_rate) / 100), 0) as voucher_redemptions,
      CASE 
        WHEN SUM(revenue_generated) > 0 THEN 
          COALESCE((SUM(revenue_generated) / NULLIF(SUM(reach * 0.5), 0) * 100), 0)
        ELSE 0 
      END as marketing_roi
    FROM campaigns
    WHERE farmer_id = $1;
  `;
  const result = await pool.query(query, [farmer_id]);
  return result.rows[0];
};

module.exports = {
  createCampaign,
  getCampaignsByFarmer,
  getCampaignById,
  updateCampaignStatus,
  deleteCampaign,
  getMarketingStats
};

const updateCampaign = async (id, farmer_id, data) => {
  const {
    name,
    type,
    start_date,
    end_date,
    discount_type,
    discount_value,
    voucher_code
  } = data;
  
  const query = `
    UPDATE campaigns
    SET name = $1, type = $2, start_date = $3, end_date = $4, discount_type = $5, discount_value = $6, voucher_code = $7
    WHERE id = $8 AND farmer_id = $9
    RETURNING *;
  `;
  const result = await pool.query(query, [
    name, type, start_date, end_date, discount_type, discount_value, voucher_code, id, farmer_id
  ]);
  return result.rows[0];
};

module.exports.updateCampaign = updateCampaign;
