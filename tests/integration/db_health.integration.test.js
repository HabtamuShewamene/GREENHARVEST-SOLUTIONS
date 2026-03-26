const request = require("supertest");
const { Pool } = require("pg");

const {
  closeIntegrationDatabase,
  initializeIntegrationDatabase,
} = require("../helpers/integrationDb");

const hasRealTestDb =
  Boolean(process.env.TEST_DB_URL) &&
  !/your_database_password/i.test(process.env.TEST_DB_URL) &&
  !/example/i.test(process.env.TEST_DB_URL);

const describeIntegration = hasRealTestDb ? describe : describe.skip;

describeIntegration("Database health integration", () => {
  let app;
  let appPool;
  let adminPool;
  let testPool;

  beforeAll(async () => {
    adminPool = await initializeIntegrationDatabase();

    testPool = new Pool({
      connectionString: process.env.TEST_DB_URL,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });

    jest.resetModules();
    app = require("../../src/app");
    appPool = require("../../src/config/db").pool;
  });

  afterAll(async () => {
    if (testPool) {
      await testPool.end();
    }

    if (appPool) {
      await appPool.end();
    }

    if (adminPool) {
      await closeIntegrationDatabase(adminPool);
    }
  });

  test("GET /api/db-health returns a PostgreSQL timestamp", async () => {
    const response = await request(app).get("/api/db-health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.database).toBe("connected");
    expect(response.body.timestamp).toBeTruthy();
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  test("direct Pool.query SELECT NOW() returns a PostgreSQL timestamp", async () => {
    const result = await testPool.query("SELECT NOW() AS current_time");

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].current_time).toBeTruthy();
    expect(Number.isNaN(Date.parse(result.rows[0].current_time))).toBe(false);
  });
});
