const { pool } = require("../../config/db");

const roles = ["admin", "farmer", "buyer", "delivery_partner", "field_agent"];

const seedRoles = async () => {
  try {
    await pool.query("BEGIN");

    for (const roleName of roles) {
      await pool.query(
        `
          INSERT INTO roles (role_name)
          VALUES ($1)
          ON CONFLICT (role_name) DO NOTHING
        `,
        [roleName]
      );
    }

    await pool.query("COMMIT");
    console.log("Roles seeded successfully");
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Failed to seed roles", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedRoles();
