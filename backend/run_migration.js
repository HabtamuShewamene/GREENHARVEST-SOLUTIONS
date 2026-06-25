const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

const MIGRATIONS = [
  '012_create_commodity_price_history.sql',
  '013_backfill_commodity_regional_data.sql',
];

async function run() {
  for (const file of MIGRATIONS) {
    const sql = fs.readFileSync(
      path.join(__dirname, 'src/database/migrations', file),
      'utf-8'
    );
    try {
      await pool.query(sql);
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ ${file}:`, err.message);
    }
  }
  process.exit();
}

run();
