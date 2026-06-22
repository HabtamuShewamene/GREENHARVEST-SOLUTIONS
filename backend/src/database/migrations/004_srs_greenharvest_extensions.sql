-- GreenHarvest SRS extensions with backward compatibility for existing endpoints and schema.

-- 1) Expand supported user roles.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('buyer', 'farmer', 'admin', 'fieldAgent', 'deliveryPartner', 'delivery'));

-- 2) Field Agent support table.
CREATE TABLE IF NOT EXISTS agent_farmers (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farmer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_agent_farmer_assignment UNIQUE (agent_id, farmer_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_farmers_agent_id ON agent_farmers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_farmers_farmer_id ON agent_farmers(farmer_id);

-- 3) Inventory management table.
CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  farmer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_farmer_id ON inventory(farmer_id);

-- Seed inventory from existing product stock when missing.
INSERT INTO inventory (product_id, farmer_id, quantity, last_updated)
SELECT p.id, p.farmer_id, p.stock, NOW()
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
WHERE i.id IS NULL;

-- 4) Extend deliveries table for SRS fields while keeping legacy columns.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_partner_id BIGINT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_location TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(30);

UPDATE deliveries
SET delivery_partner_id = delivery_person_id
WHERE delivery_partner_id IS NULL;

UPDATE deliveries
SET delivery_location = delivery_address
WHERE delivery_location IS NULL;

UPDATE deliveries
SET status = delivery_status
WHERE status IS NULL;

ALTER TABLE deliveries
  ALTER COLUMN delivery_partner_id SET NOT NULL,
  ALTER COLUMN delivery_location SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_status_check
  CHECK (status IN ('pending', 'assigned', 'processing', 'shipped', 'out for delivery', 'delivered', 'cancelled'));

-- 5) Transaction table in addition to existing payments table.
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- 6) Extend notifications table with SRS fields while preserving legacy fields.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT 'Notification';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE notifications
SET is_read = (status = 'read')
WHERE is_read IS DISTINCT FROM (status = 'read');

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
