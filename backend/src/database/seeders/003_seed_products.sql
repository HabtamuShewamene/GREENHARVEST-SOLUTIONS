-- Seeds sample products linked to the seeded farmer and categories.
INSERT INTO products (farmer_id, category_id, name, description, price, stock, farm_location, image_url)
SELECT
  farmer.id,
  category.id,
  product_data.name,
  product_data.description,
  product_data.price,
  product_data.stock,
  product_data.farm_location,
  product_data.image_url
FROM (
  VALUES
    ('Organic Tomatoes', 'Freshly harvested organic tomatoes', 12.50, 120, 'Kaduna', 'https://example.com/images/tomatoes.jpg', 'Vegetables'),
    ('Sweet Corn', 'Golden sweet corn ready for market', 9.99, 80, 'Kaduna', 'https://example.com/images/corn.jpg', 'Grains'),
    ('Plantain Bunch', 'Healthy ripe plantain bunches', 15.75, 45, 'Kaduna', 'https://example.com/images/plantain.jpg', 'Fruits')
) AS product_data(name, description, price, stock, farm_location, image_url, category_name)
JOIN users AS farmer
  ON farmer.email = 'farmer@agro.local'
  AND farmer.role = 'farmer'
JOIN categories AS category
  ON category.name = product_data.category_name
WHERE NOT EXISTS (
  SELECT 1
  FROM products existing_product
  WHERE existing_product.name = product_data.name
    AND existing_product.farmer_id = farmer.id
);
