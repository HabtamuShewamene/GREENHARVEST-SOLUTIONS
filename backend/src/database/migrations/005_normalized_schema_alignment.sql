-- Normalized schema alignment for GreenHarvest SRS while preserving backward compatibility.

CREATE TABLE IF NOT EXISTS roles (
  role_id SMALLSERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (role_name)
VALUES
  ('admin'),
  ('farmer'),
  ('buyer'),
  ('delivery_partner'),
  ('field_agent')
ON CONFLICT (role_name) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id SMALLINT REFERENCES roles(role_id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE users u
SET role_id = r.role_id
FROM roles r
WHERE u.role_id IS NULL
  AND (
    (u.role IN ('deliveryPartner', 'delivery') AND r.role_name = 'delivery_partner') OR
    (u.role = 'fieldAgent' AND r.role_name = 'field_agent') OR
    (LOWER(u.role) = r.role_name)
  );

ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS farmer_profiles (
  profile_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  farm_name VARCHAR(200),
  farm_type VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  profile_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_contact_method VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_profiles (
  profile_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(100),
  license_number VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_agent_profiles (
  profile_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  assigned_region VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  address_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100),
  line1 TEXT NOT NULL,
  line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL DEFAULT 'Ethiopia',
  postal_code VARCHAR(20),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  image_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
  cart_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id)
);

INSERT INTO carts (user_id)
SELECT DISTINCT c.user_id
FROM cart c
LEFT JOIN carts nc ON nc.user_id = c.user_id
WHERE nc.cart_id IS NULL;

INSERT INTO cart_items (cart_id, product_id, quantity)
SELECT nc.cart_id, c.product_id, c.quantity
FROM cart c
JOIN carts nc ON nc.user_id = c.user_id
LEFT JOIN cart_items ci ON ci.cart_id = nc.cart_id AND ci.product_id = c.product_id
WHERE ci.cart_item_id IS NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_id BIGINT REFERENCES addresses(address_id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0);

UPDATE orders SET total_amount = total_price WHERE total_amount = 0;

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
