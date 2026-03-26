const fs = require("fs/promises");
const path = require("path");

const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const ROLE_NAMES = [
  "admin",
  "farmer",
  "buyer",
  "delivery_partner",
  "field_agent",
];

const RUNTIME_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS roles (
  role_id SMALLSERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  user_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id SMALLINT REFERENCES roles(role_id) ON DELETE RESTRICT,
  role VARCHAR(50) DEFAULT 'buyer',
  phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token_hash TEXT,
  verification_token_expiry TIMESTAMPTZ,
  password_reset_token_hash TEXT,
  password_reset_token_expiry TIMESTAMPTZ,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  backup_email VARCHAR(255),
  recovery_phone VARCHAR(50),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  buyer_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  preferred_contact_method VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farmer_profiles (
  farmer_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  farm_name VARCHAR(200),
  farm_type VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_profiles (
  delivery_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  vehicle_type VARCHAR(100),
  license_number VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_agent_profiles (
  agent_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_region VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sync_buyer_profile_ids() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.buyer_id IS NOT NULL THEN
    NEW.user_id := NEW.buyer_id;
  END IF;

  IF NEW.buyer_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.buyer_id := NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_farmer_profile_ids() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.farmer_id IS NOT NULL THEN
    NEW.user_id := NEW.farmer_id;
  END IF;

  IF NEW.farmer_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.farmer_id := NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_delivery_profile_ids() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.delivery_id IS NOT NULL THEN
    NEW.user_id := NEW.delivery_id;
  END IF;

  IF NEW.delivery_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.delivery_id := NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_agent_profile_ids() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.agent_id IS NOT NULL THEN
    NEW.user_id := NEW.agent_id;
  END IF;

  IF NEW.agent_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.agent_id := NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_buyer_profile_ids ON buyer_profiles;
CREATE TRIGGER trg_sync_buyer_profile_ids
BEFORE INSERT OR UPDATE ON buyer_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_buyer_profile_ids();

DROP TRIGGER IF EXISTS trg_sync_farmer_profile_ids ON farmer_profiles;
CREATE TRIGGER trg_sync_farmer_profile_ids
BEFORE INSERT OR UPDATE ON farmer_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_farmer_profile_ids();

DROP TRIGGER IF EXISTS trg_sync_delivery_profile_ids ON delivery_profiles;
CREATE TRIGGER trg_sync_delivery_profile_ids
BEFORE INSERT OR UPDATE ON delivery_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_delivery_profile_ids();

DROP TRIGGER IF EXISTS trg_sync_agent_profile_ids ON field_agent_profiles;
CREATE TRIGGER trg_sync_agent_profile_ids
BEFORE INSERT OR UPDATE ON field_agent_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_agent_profile_ids();

CREATE TABLE IF NOT EXISTS addresses (
  address_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS categories (
  category_id BIGSERIAL PRIMARY KEY,
  category_name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  product_id BIGSERIAL PRIMARY KEY,
  farmer_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(category_id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  farm_location VARCHAR(255),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  image_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(product_id) ON DELETE CASCADE,
  farmer_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_farmers (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  farmer_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_agent_farmer_assignment UNIQUE (agent_id, farmer_id)
);

CREATE TABLE IF NOT EXISTS carts (
  cart_id BIGSERIAL PRIMARY KEY,
  buyer_id BIGINT UNIQUE,
  user_id BIGINT UNIQUE,
  product_id BIGINT,
  quantity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sync_cart_user_ids() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.buyer_id IS NOT NULL THEN
    NEW.user_id := NEW.buyer_id;
  END IF;

  IF NEW.buyer_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.buyer_id := NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cart_user_ids ON carts;
CREATE TRIGGER trg_sync_cart_user_ids
BEFORE INSERT OR UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION sync_cart_user_ids();

ALTER TABLE carts
  ADD CONSTRAINT carts_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE carts
  ADD CONSTRAINT carts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id BIGSERIAL PRIMARY KEY,
  buyer_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  farmer_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  field_agent_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  delivery_partner_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  address_id BIGINT REFERENCES addresses(address_id) ON DELETE SET NULL,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  order_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  payment_method VARCHAR(50),
  amount NUMERIC(10, 2),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id_unique
ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT REFERENCES payments(payment_id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(order_id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  delivery_partner_id BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
  delivery_person_id BIGINT REFERENCES users(user_id) ON DELETE RESTRICT,
  delivery_address TEXT,
  pickup_location TEXT,
  delivery_location TEXT,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  status VARCHAR(30),
  estimated_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  review_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  buyer_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_product_user_unique UNIQUE (product_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'Notification',
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  status VARCHAR(20) NOT NULL DEFAULT 'unread',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_ip VARCHAR(100),
  user_agent TEXT,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_hash TEXT,
  revoked_reason VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purpose VARCHAR(50) NOT NULL,
  challenge_hash TEXT NOT NULL UNIQUE,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const RESET_TABLES = [
  "otp_codes",
  "refresh_tokens",
  "notifications",
  "reviews",
  "deliveries",
  "transactions",
  "payments",
  "order_items",
  "orders",
  "cart_items",
  "carts",
  "inventory",
  "product_images",
  "products",
  "categories",
  "agent_farmers",
  "delivery_profiles",
  "field_agent_profiles",
  "farmer_profiles",
  "buyer_profiles",
  "addresses",
  "users",
];

const normalizeRoleName = (role) => {
  if (role === "fieldAgent") {
    return "field_agent";
  }

  if (role === "deliveryPartner") {
    return "delivery_partner";
  }

  return role;
};

const applyTestDbEnvironment = () => {
  if (!process.env.TEST_DB_URL) {
    return null;
  }

  const parsedUrl = new URL(process.env.TEST_DB_URL);
  const databaseName = parsedUrl.pathname.replace(/^\//, "");

  if (!/test/i.test(databaseName)) {
    throw new Error(
      `Refusing to run integration tests against non-test database '${databaseName}'.`
    );
  }

  process.env.DB_USER = decodeURIComponent(parsedUrl.username);
  process.env.DB_PASSWORD = decodeURIComponent(parsedUrl.password);
  process.env.DB_HOST = parsedUrl.hostname;
  process.env.DB_PORT = parsedUrl.port || "5432";
  process.env.DB_NAME = databaseName;
  process.env.DB_SSL = parsedUrl.searchParams.get("sslmode") === "require" ? "true" : "false";

  return databaseName;
};

const createTestPool = () => {
  if (!process.env.TEST_DB_URL) {
    throw new Error("TEST_DB_URL is required for integration tests");
  }

  return new Pool({
    connectionString: process.env.TEST_DB_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: false,
  });
};

const resetPublicSchema = async (pool) => {
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
};

const seedRoles = async (pool) => {
  for (const roleName of ROLE_NAMES) {
    await pool.query(
      `
        INSERT INTO roles (role_name)
        VALUES ($1)
        ON CONFLICT (role_name) DO NOTHING
      `,
      [roleName]
    );
  }
};

const runMigrationsBestEffort = async (pool) => {
  const migrationsDirectory = path.resolve(
    __dirname,
    "..",
    "..",
    "src",
    "database",
    "migrations"
  );
  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of migrationFiles) {
    const filePath = path.join(migrationsDirectory, fileName);
    const sql = await fs.readFile(filePath, "utf8");

    try {
      await pool.query(sql);
    } catch (error) {
      console.warn(`Migration '${fileName}' failed during integration setup and was skipped`, {
        message: error.message,
        code: error.code,
      });
    }
  }
};

const initializeIntegrationDatabase = async () => {
  applyTestDbEnvironment();
  const pool = createTestPool();

  await resetPublicSchema(pool);
  await pool.query(RUNTIME_SCHEMA_SQL);
  await runMigrationsBestEffort(pool);
  await seedRoles(pool);

  return pool;
};

const resetIntegrationDatabase = async (pool) => {
  await pool.query(`TRUNCATE TABLE ${RESET_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  await seedRoles(pool);
};

const closeIntegrationDatabase = async (pool) => {
  await pool.end();
};

const getRoleId = async (pool, roleName) => {
  const result = await pool.query(
    `SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1`,
    [normalizeRoleName(roleName)]
  );

  if (!result.rows[0]) {
    throw new Error(`Role '${roleName}' is not available in the integration database`);
  }

  return result.rows[0].role_id;
};

const ensureProfileRow = async (pool, roleName, userId) => {
  const role = normalizeRoleName(roleName);

  if (role === "buyer") {
    await pool.query(
      `
        INSERT INTO buyer_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );
  }

  if (role === "farmer") {
    await pool.query(
      `
        INSERT INTO farmer_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );
  }

  if (role === "delivery_partner") {
    await pool.query(
      `
        INSERT INTO delivery_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );
  }

  if (role === "field_agent") {
    await pool.query(
      `
        INSERT INTO field_agent_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );
  }
};

const createUser = async (
  pool,
  {
    name,
    email,
    password,
    role,
    isVerified = true,
  }
) => {
  const normalizedRole = normalizeRoleName(role);
  const passwordHash = await bcrypt.hash(password, 10);
  const roleId = await getRoleId(pool, normalizedRole);

  const result = await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role_id,
        role,
        is_verified,
        mfa_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING user_id, name, email
    `,
    [name, email, passwordHash, roleId, normalizedRole, isVerified]
  );

  const user = result.rows[0];
  await ensureProfileRow(pool, normalizedRole, user.user_id);

  return {
    id: user.user_id,
    email: user.email,
    name: user.name,
    password,
    role: normalizedRole,
  };
};

const createCategory = async (pool, { name, description = null }) => {
  const result = await pool.query(
    `
      INSERT INTO categories (category_name, description)
      VALUES ($1, $2)
      RETURNING category_id AS id, category_name, description
    `,
    [name, description]
  );

  return result.rows[0];
};

const queryOne = async (pool, sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
};

const queryRows = async (pool, sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

module.exports = {
  applyTestDbEnvironment,
  closeIntegrationDatabase,
  createCategory,
  createUser,
  initializeIntegrationDatabase,
  queryOne,
  queryRows,
  resetIntegrationDatabase,
};
