-- Migration 011: Add product status column, extend order_status constraint,
-- and create the returns table with indexes.

-- ============================================================
-- 1. Products table — add status column
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status VARCHAR(20)
    NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'deactivated'));

-- Backfill any existing rows that may have NULL (precautionary)
UPDATE products SET status = 'active' WHERE status IS NULL;

-- ============================================================
-- 2. Orders table — extend order_status CHECK constraint to
--    include 'returned' and the normalised lifecycle values.
--    PostgreSQL requires DROP + ADD to replace a CHECK constraint.
-- ============================================================
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'pending',
    'confirmed',
    'collected',
    'in_transit',
    'delivered',
    'returned',
    'return_requested',
    'return_processing',
    'refunded',
    'cancelled'
  ));

-- ============================================================
-- 3. Returns table
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
  id               BIGSERIAL PRIMARY KEY,
  order_id         BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  farmer_id        BIGINT NOT NULL REFERENCES users(id),
  buyer_id         BIGINT NOT NULL REFERENCES users(id),
  reason           TEXT NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'rejected')),
  refund_status    VARCHAR(20) NOT NULL DEFAULT 'none'
                     CHECK (refund_status IN ('none', 'pending', 'issued')),
  restock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. Indexes on returns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_returns_order_id  ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_farmer_id ON returns(farmer_id);
CREATE INDEX IF NOT EXISTS idx_returns_buyer_id  ON returns(buyer_id);
