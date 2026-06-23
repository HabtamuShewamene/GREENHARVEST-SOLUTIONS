CREATE TABLE IF NOT EXISTS market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  market_avg_price DECIMAL(10, 2) NOT NULL,
  trend_label VARCHAR(100),
  region VARCHAR(100) DEFAULT 'Addis Ababa Hub',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actionable_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_name VARCHAR(255) NOT NULL,
  asset_category VARCHAR(100),
  demand_level VARCHAR(50),
  supply_gap_percentage INT DEFAULT 0,
  action_type VARCHAR(50),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_strategic_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  highlight_word VARCHAR(100),
  highlight_metric VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
