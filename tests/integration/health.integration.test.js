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

const describeLiveDb = hasRealTestDb ? describe : describe.skip;

describeLiveDb("Health integration with live PostgreSQL", () => {
  let app;
  let appPool;
  let adminPool;
  let testPool;

  beforeAll(async () => {
    // Build the isolated integration schema so the shared app pool can connect safely in test mode.
    adminPool = await initializeIntegrationDatabase();

    // Create a dedicated Pool in the test so setup and teardown are explicit.
    testPool = new Pool({
      connectionString:
        process.env.NODE_ENV === "test" ? process.env.TEST_DB_URL : process.env.DATABASE_URL,
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

  test("GET /api/health returns 200 and PostgreSQL time when the database is up", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.backend).toBe("running");
    expect(response.body.database).toBe("connected");
    expect(response.body.dbTime).toBeTruthy();
    expect(Number.isNaN(Date.parse(response.body.dbTime))).toBe(false);
  });
});

describe("Health integration with mocked DB failure", () => {
  let app;

  beforeAll(() => {
    jest.resetModules();

    // Force the route to see a failing PostgreSQL query so we can verify the 503 readiness response.
    jest.doMock("../../src/config/db", () => ({
      pool: {
        query: jest.fn().mockRejectedValue(new Error("database unavailable")),
      },
    }));

    const healthRoutes = require("../../src/routes/healthRoutes");
    const { createRouteApp } = require("../helpers/createRouteApp");

    app = createRouteApp("/api", healthRoutes);
  });

  afterAll(() => {
    jest.resetModules();
    jest.dontMock("../../src/config/db");
  });

  test("GET /api/health returns 503 when PostgreSQL is disconnected", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("fail");
    expect(response.body.backend).toBe("running");
    expect(response.body.database).toBe("disconnected");
    expect(response.body.error).toBe("database unavailable");
  });
});
