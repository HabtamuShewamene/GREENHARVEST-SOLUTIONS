const bcrypt = require("bcrypt");
const { pool } = require("../../config/db");

const seedAdmin = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@greenharvest.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@1234";
  const adminName = process.env.SEED_ADMIN_NAME || "System Admin";

  try {
    await pool.query("BEGIN");

    const roleResult = await pool.query(
      `SELECT role_id, role_name FROM roles WHERE role_name = $1`,
      ["admin"]
    );

    if (roleResult.rows.length === 0) {
      throw new Error("Admin role not found. Run seed:roles first.");
    }

    const adminRole = roleResult.rows[0];

    const existingResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      await pool.query("COMMIT");
      console.log("Admin user already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `
        INSERT INTO users (name, email, password, role_id, role)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [adminName, adminEmail.toLowerCase(), hashedPassword, adminRole.role_id, adminRole.role_name]
    );

    await pool.query("COMMIT");
    console.log("Admin user seeded successfully");
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Failed to seed admin", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedAdmin();
