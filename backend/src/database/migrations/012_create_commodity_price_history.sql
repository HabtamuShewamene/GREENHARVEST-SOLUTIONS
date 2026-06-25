CREATE TABLE IF NOT EXISTS commodity_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'ETB/Quintal',
    region VARCHAR(100),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commodity_price_history_commodity ON commodity_price_history (commodity_name);
CREATE INDEX IF NOT EXISTS idx_commodity_price_history_recorded_at ON commodity_price_history (recorded_at);
CREATE INDEX IF NOT EXISTS idx_commodity_price_history_region ON commodity_price_history (region);

-- Seed historical price data (skip if already populated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM commodity_price_history LIMIT 1) THEN
    INSERT INTO commodity_price_history (commodity_name, price, region, recorded_at) VALUES
    -- Teff price history
    ('Teff (Grade A)', 1200, 'Addis Ababa', '2025-11-01'),
    ('Teff (Grade A)', 1250, 'Addis Ababa', '2025-12-01'),
    ('Teff (Grade A)', 1280, 'Addis Ababa', '2026-01-01'),
    ('Teff (Grade A)', 1300, 'Addis Ababa', '2026-02-01'),
    ('Teff (Grade A)', 1315, 'Addis Ababa', '2026-03-01'),
    ('Teff (Grade A)', 1323, 'Addis Ababa', '2026-04-01'),
    -- Coffee price history
    ('Coffee (Arabica)', 800, 'Addis Ababa', '2025-11-01'),
    ('Coffee (Arabica)', 750, 'Addis Ababa', '2025-12-01'),
    ('Coffee (Arabica)', 770, 'Addis Ababa', '2026-01-01'),
    ('Coffee (Arabica)', 760, 'Addis Ababa', '2026-02-01'),
    ('Coffee (Arabica)', 780, 'Addis Ababa', '2026-03-01'),
    ('Coffee (Arabica)', 788, 'Addis Ababa', '2026-04-01'),
    -- Wheat price history
    ('Wheat', 650, 'Addis Ababa', '2025-11-01'),
    ('Wheat', 640, 'Addis Ababa', '2025-12-01'),
    ('Wheat', 630, 'Addis Ababa', '2026-01-01'),
    ('Wheat', 625, 'Addis Ababa', '2026-02-01'),
    ('Wheat', 620, 'Addis Ababa', '2026-03-01'),
    ('Wheat', 615, 'Addis Ababa', '2026-04-01'),
    -- Maize price history
    ('Maize', 480, 'Addis Ababa', '2025-11-01'),
    ('Maize', 490, 'Addis Ababa', '2025-12-01'),
    ('Maize', 500, 'Addis Ababa', '2026-01-01'),
    ('Maize', 510, 'Addis Ababa', '2026-02-01'),
    ('Maize', 515, 'Addis Ababa', '2026-03-01'),
    ('Maize', 522, 'Addis Ababa', '2026-04-01'),
    -- Regional demand snapshots (latest month per region)
    ('Teff (Grade A)', 1350, 'Addis Ababa', '2026-04-15'),
    ('Teff (Grade A)', 1280, 'Dire Dawa', '2026-04-15'),
    ('Teff (Grade A)', 1220, 'Bahir Dar', '2026-04-15'),
    ('Teff (Grade A)', 1180, 'Hawassa', '2026-04-15'),
    ('Coffee (Arabica)', 810, 'Addis Ababa', '2026-04-15'),
    ('Coffee (Arabica)', 790, 'Dire Dawa', '2026-04-15'),
    ('Coffee (Arabica)', 760, 'Bahir Dar', '2026-04-15'),
    ('Coffee (Arabica)', 740, 'Hawassa', '2026-04-15'),
    ('Wheat', 620, 'Addis Ababa', '2026-04-15'),
    ('Wheat', 600, 'Dire Dawa', '2026-04-15'),
    ('Wheat', 580, 'Bahir Dar', '2026-04-15'),
    ('Wheat', 560, 'Hawassa', '2026-04-15'),
    ('Maize', 530, 'Addis Ababa', '2026-04-15'),
    ('Maize', 510, 'Dire Dawa', '2026-04-15'),
    ('Maize', 495, 'Bahir Dar', '2026-04-15'),
    ('Maize', 480, 'Hawassa', '2026-04-15');
  END IF;
END $$;
