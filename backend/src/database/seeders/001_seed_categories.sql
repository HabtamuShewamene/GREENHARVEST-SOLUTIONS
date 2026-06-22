-- Seeds baseline product categories for the agricultural marketplace.
INSERT INTO categories (name, description)
SELECT category_data.name, category_data.description
FROM (
  VALUES
    ('Vegetables', 'Fresh farm vegetables and leafy produce'),
    ('Fruits', 'Seasonal fruits harvested from local farms'),
    ('Grains', 'Maize, rice, wheat, millet, and other grains'),
    ('Seeds', 'Planting seeds and nursery inputs'),
    ('Dairy', 'Milk, cheese, yogurt, and related dairy goods')
) AS category_data(name, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM categories existing_category
  WHERE LOWER(existing_category.name) = LOWER(category_data.name)
);
