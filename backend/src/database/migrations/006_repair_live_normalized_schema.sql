-- Repairs partially migrated databases so the runtime schema matches the
-- normalized GreenHarvest backend expectations.

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE users u
SET role_id = r.role_id
FROM roles r
WHERE u.role_id IS NULL
  AND (
    (LOWER(u.role) = 'admin' AND r.role_name = 'admin') OR
    (LOWER(u.role) = 'farmer' AND r.role_name = 'farmer') OR
    (LOWER(u.role) = 'buyer' AND r.role_name = 'buyer') OR
    (LOWER(u.role) IN ('deliverypartner', 'delivery_partner', 'delivery') AND r.role_name = 'delivery_partner') OR
    (LOWER(u.role) IN ('fieldagent', 'field_agent') AND r.role_name = 'field_agent')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- addresses
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS label VARCHAR(100);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS line1 TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS line2 TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE addresses
SET line1 = COALESCE(line1, street),
    state = COALESCE(state, region)
WHERE line1 IS NULL OR state IS NULL;

-- product_images
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- inventory
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'inventory_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'id'
  ) THEN
    ALTER TABLE inventory RENAME COLUMN inventory_id TO id;
  END IF;
END $$;

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS farmer_id INTEGER;

UPDATE inventory i
SET farmer_id = p.farmer_id
FROM products p
WHERE i.farmer_id IS NULL AND p.id = i.product_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_farmer_id_fkey'
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_farmer_id_fkey
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product_id_unique ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_farmer_id ON inventory(farmer_id);

-- carts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carts' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carts' AND column_name = 'cart_id'
  ) THEN
    ALTER TABLE carts RENAME COLUMN id TO cart_id;
  END IF;
END $$;

ALTER TABLE carts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE carts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO cart_items (cart_id, product_id, quantity)
SELECT c.cart_id, c.product_id, c.quantity
FROM carts c
LEFT JOIN cart_items ci
  ON ci.cart_id = c.cart_id AND ci.product_id = c.product_id
WHERE c.product_id IS NOT NULL
  AND c.quantity IS NOT NULL
  AND ci.cart_item_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_id_unique ON carts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_cart_product_unique ON cart_items(cart_id, product_id);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE orders
SET total_amount = COALESCE(total_amount, total_price, 0)
WHERE total_amount = 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_address_id_fkey'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_address_id_fkey
      FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL;
  END IF;
END $$;

-- deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_partner_id INTEGER;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_location TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE deliveries
SET delivery_partner_id = COALESCE(delivery_partner_id, delivery_person_id),
    delivery_location = COALESCE(delivery_location, delivery_address),
    status = COALESCE(status, delivery_status)
WHERE delivery_partner_id IS NULL OR delivery_location IS NULL OR status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deliveries_delivery_partner_id_fkey'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT deliveries_delivery_partner_id_fkey
      FOREIGN KEY (delivery_partner_id) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT 'Notification';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE notifications
SET is_read = (status = 'read')
WHERE is_read IS DISTINCT FROM (status = 'read');

-- transactions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'id'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN transaction_id TO id;
  END IF;
END $$;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'paid';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE transactions t
SET order_id = p.order_id,
    user_id = o.buyer_id,
    payment_method = p.payment_method,
    status = COALESCE(status, p.payment_status, 'paid'),
    created_at = COALESCE(created_at, transaction_date, NOW())
FROM payments p
LEFT JOIN orders o ON o.id = p.order_id
WHERE t.payment_id = p.id
  AND (t.order_id IS NULL OR t.user_id IS NULL OR t.payment_method IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_order_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_user_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
