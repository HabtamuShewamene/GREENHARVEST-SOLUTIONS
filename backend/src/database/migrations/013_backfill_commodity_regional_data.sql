-- Backfill regional commodity snapshots and additional commodities for market/advisor charts

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM commodity_price_history WHERE region IS NOT NULL LIMIT 1) THEN
    INSERT INTO commodity_price_history (commodity_name, price, region, recorded_at) VALUES
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

  IF NOT EXISTS (SELECT 1 FROM commodity_price_history WHERE commodity_name = 'Wheat' LIMIT 1) THEN
    INSERT INTO commodity_price_history (commodity_name, price, recorded_at) VALUES
    ('Wheat', 650, '2025-11-01'),
    ('Wheat', 640, '2025-12-01'),
    ('Wheat', 630, '2026-01-01'),
    ('Wheat', 625, '2026-02-01'),
    ('Wheat', 620, '2026-03-01'),
    ('Wheat', 615, '2026-04-01'),
    ('Maize', 480, '2025-11-01'),
    ('Maize', 490, '2025-12-01'),
    ('Maize', 500, '2026-01-01'),
    ('Maize', 510, '2026-02-01'),
    ('Maize', 515, '2026-03-01'),
    ('Maize', 522, '2026-04-01');
  END IF;
END $$;
