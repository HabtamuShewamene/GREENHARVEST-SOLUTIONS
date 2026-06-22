const { pool } = require("../../config/db");

const defaultCategories = [
  { name: "Vegetables", description: "Fresh local vegetables" },
  { name: "Fruits", description: "Seasonal and tropical fruits" },
  { name: "Grains", description: "Cereals, pulses, and grains" },
  { name: "Dairy", description: "Milk and dairy products" },
  { name: "Livestock", description: "Animal products and poultry" },
];

const seedCategories = async () => {
  try {
    await pool.query("BEGIN");

    for (const category of defaultCategories) {
      await pool.query(
        `
          INSERT INTO categories (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name)
          DO UPDATE SET description = EXCLUDED.description
        `,
        [category.name, category.description]
      );
    }

    await pool.query("COMMIT");
    console.log("Categories seeded successfully");
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Failed to seed categories", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedCategories();
