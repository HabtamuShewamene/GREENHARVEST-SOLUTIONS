const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const buildApp = ({ adminServiceMock, poolQueryMock, userServiceMock }) => {
  jest.resetModules();

  jest.doMock("../src/config/db", () => ({
    pool: {
      connect: jest.fn(),
      query: poolQueryMock,
    },
  }));
  jest.doMock("../src/services/adminService", () => adminServiceMock);
  jest.doMock("../src/services/userService", () => userServiceMock);
  jest.doMock("../src/utils/logger", () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }));

  return require("../src/app");
};

const createPoolQueryMock = () =>
  jest.fn(async (sql) => {
    if (typeof sql === "string" && sql.includes("buyer_profiles")) {
      return { rows: [{ buyer_id: 201 }] };
    }

    if (typeof sql === "string" && sql.includes("farmer_profiles")) {
      return { rows: [{ farmer_id: 301 }] };
    }

    if (typeof sql === "string" && sql.includes("field_agent_profiles")) {
      return { rows: [{ agent_id: 401 }] };
    }

    if (typeof sql === "string" && sql.includes("delivery_profiles")) {
      return { rows: [{ delivery_id: 501 }] };
    }

    if (typeof sql === "string" && sql.includes("SELECT NOW()")) {
      return {
        rows: [{ current_time: "2026-03-26T12:00:00.000Z" }],
      };
    }

    return { rows: [] };
  });

describe("Access and security", () => {
  let adminToken;
  let agentToken;
  let buyerToken;
  let deliveryToken;
  let expiredBuyerToken;
  let farmerToken;

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: 1, role: "admin", token_type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    buyerToken = jwt.sign(
      { id: 2, role: "buyer", token_type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    farmerToken = jwt.sign(
      { id: 3, role: "farmer", token_type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    agentToken = jwt.sign(
      { id: 4, role: "fieldAgent", token_type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    deliveryToken = jwt.sign(
      { id: 5, role: "delivery_partner", token_type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    expiredBuyerToken = jwt.sign(
      { id: 6, role: "buyer", token_type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );
  });

  test("admin can access admin dashboard and non-admins are blocked", async () => {
    const adminServiceMock = {
      getDashboardAnalytics: jest.fn().mockResolvedValue({
        total_users: 5,
        total_orders: 3,
      }),
    };
    const userServiceMock = {
      getMe: jest.fn(),
      listUsers: jest.fn(),
    };
    const app = buildApp({
      adminServiceMock,
      poolQueryMock: createPoolQueryMock(),
      userServiceMock,
    });

    const adminResponse = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    const buyerResponse = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.metrics.total_users).toBe(5);
    expect(buyerResponse.status).toBe(403);
    expect(buyerResponse.body.message).toContain("Required role: admin");
  });

  test("admin can list users and role restrictions are enforced at route level", async () => {
    const adminServiceMock = {
      getDashboardAnalytics: jest.fn(),
    };
    const userServiceMock = {
      getMe: jest.fn(),
      listUsers: jest.fn().mockResolvedValue([
        { id: 2, email: "buyer@example.com", role: "buyer" },
      ]),
    };
    const app = buildApp({
      adminServiceMock,
      poolQueryMock: createPoolQueryMock(),
      userServiceMock,
    });

    const adminResponse = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    const deliveryResponse = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${deliveryToken}`);

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.users).toHaveLength(1);
    expect(deliveryResponse.status).toBe(403);
    expect(deliveryResponse.body.message).toContain("Required role: admin");
  });

  test("authenticated users can access /api/users/me with resolved actor ids", async () => {
    const adminServiceMock = {
      getDashboardAnalytics: jest.fn(),
    };
    const userServiceMock = {
      getMe: jest
        .fn()
        .mockResolvedValueOnce({ id: 201, email: "buyer@example.com", role: "buyer" })
        .mockResolvedValueOnce({ id: 301, email: "farmer@example.com", role: "farmer" })
        .mockResolvedValueOnce({ id: 401, email: "agent@example.com", role: "field_agent" }),
      listUsers: jest.fn(),
    };
    const poolQueryMock = createPoolQueryMock();
    const app = buildApp({
      adminServiceMock,
      poolQueryMock,
      userServiceMock,
    });

    const buyerResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${buyerToken}`);
    const farmerResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${farmerToken}`);
    const agentResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${agentToken}`);

    expect(buyerResponse.status).toBe(200);
    expect(buyerResponse.body.user.id).toBe(201);
    expect(farmerResponse.status).toBe(200);
    expect(farmerResponse.body.user.id).toBe(301);
    expect(agentResponse.status).toBe(200);
    expect(agentResponse.body.user.id).toBe(401);
    expect(poolQueryMock).toHaveBeenCalled();
  });

  test("protected routes reject missing, invalid, and expired tokens", async () => {
    const adminServiceMock = {
      getDashboardAnalytics: jest.fn(),
    };
    const userServiceMock = {
      getMe: jest.fn(),
      listUsers: jest.fn(),
    };
    const app = buildApp({
      adminServiceMock,
      poolQueryMock: createPoolQueryMock(),
      userServiceMock,
    });

    const missingTokenResponse = await request(app).get("/api/users/me");
    const invalidTokenResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer not-a-real-token");
    const expiredTokenResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${expiredBuyerToken}`);

    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body.message).toContain("Authorization token is required");
    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body.message).toBe("Invalid token");
    expect(expiredTokenResponse.status).toBe(401);
    expect(expiredTokenResponse.body.message).toBe("Token has expired");
  });

  test("app exposes helmet headers, database health route, and 404 handling", async () => {
    const adminServiceMock = {
      getDashboardAnalytics: jest.fn(),
    };
    const userServiceMock = {
      getMe: jest.fn(),
      listUsers: jest.fn(),
    };
    const poolQueryMock = createPoolQueryMock();
    const app = buildApp({
      adminServiceMock,
      poolQueryMock,
      userServiceMock,
    });

    const rootResponse = await request(app).get("/");
    const dbResponse = await request(app).get("/test-db");
    const missingResponse = await request(app).get("/route-that-does-not-exist");

    expect(rootResponse.status).toBe(200);
    expect(rootResponse.headers["x-dns-prefetch-control"]).toBe("off");
    expect(rootResponse.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(rootResponse.headers["x-content-type-options"]).toBe("nosniff");

    expect(dbResponse.status).toBe(200);
    expect(dbResponse.body.message).toBe("Database connection successful");
    expect(poolQueryMock).toHaveBeenCalledWith("SELECT NOW() AS current_time");

    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body.message).toBe("Route not found");
  });

  test("test-db returns 500 when the database query fails", async () => {
    const adminServiceMock = {
      getDashboardAnalytics: jest.fn(),
    };
    const userServiceMock = {
      getMe: jest.fn(),
      listUsers: jest.fn(),
    };
    const poolQueryMock = jest.fn(async (sql) => {
      if (typeof sql === "string" && sql.includes("SELECT NOW()")) {
        throw new Error("db down");
      }

      return { rows: [] };
    });
    const app = buildApp({
      adminServiceMock,
      poolQueryMock,
      userServiceMock,
    });

    const response = await request(app).get("/test-db");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Database connection error");
  });

  test("rate limiting is enforced when explicitly enabled", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDisableRateLimit = process.env.DISABLE_RATE_LIMIT;
    const previousLoginRateLimitMax = process.env.LOGIN_RATE_LIMIT_MAX;
    const previousLoginRateLimitWindowMs = process.env.LOGIN_RATE_LIMIT_WINDOW_MS;

    process.env.NODE_ENV = "production";
    process.env.DISABLE_RATE_LIMIT = "false";
    process.env.LOGIN_RATE_LIMIT_MAX = "1";
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = "60000";

    try {
      jest.resetModules();
      const { loginRateLimiter } = require("../src/middleware/authRateLimitMiddleware");
      const app = express();

      app.use(express.json());
      app.post("/login", loginRateLimiter, (req, res) => {
        res.status(200).json({ ok: true });
      });

      const firstResponse = await request(app).post("/login").send({ email: "buyer@example.com" });
      const secondResponse = await request(app).post("/login").send({ email: "buyer@example.com" });

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(429);
      expect(secondResponse.body.message).toBe(
        "Too many login attempts. Please try again later."
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.DISABLE_RATE_LIMIT = previousDisableRateLimit;
      process.env.LOGIN_RATE_LIMIT_MAX = previousLoginRateLimitMax;
      process.env.LOGIN_RATE_LIMIT_WINDOW_MS = previousLoginRateLimitWindowMs;
    }
  });
});
