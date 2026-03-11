-- Seeds baseline product categories for the agricultural marketplace.
INSERT INTO categories (name, description)
VALUES
  ('Vegetables', 'Fresh farm vegetables and leafy produce'),
  ('Fruits', 'Seasonal fruits harvested from local farms'),
  ('Grains', 'Maize, rice, wheat, millet, and other grains'),
  ('Seeds', 'Planting seeds and nursery inputs'),
  ('Dairy', 'Milk, cheese, yogurt, and related dairy goods')
ON CONFLICT (name) DO NOTHING;
