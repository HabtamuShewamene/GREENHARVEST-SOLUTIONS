CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  farmer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  voucher_code VARCHAR(50),
  reach INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 2) DEFAULT 0.0,
  revenue_generated NUMERIC(12, 2) DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_products (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_farmer_id ON campaigns(farmer_id);
