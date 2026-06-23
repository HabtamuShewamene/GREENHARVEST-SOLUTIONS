CREATE TABLE IF NOT EXISTS store_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_settings JSONB DEFAULT '{}'::jsonb,
  modules JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(farmer_id)
);
