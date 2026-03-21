const request = require("supertest");
const express = require("express");

describe("Middleware tests", () => {
  test("authMiddleware rejects missing bearer token", async () => {
    jest.resetModules();
    jest.doMock("../src/config/db", () => ({
      pool: {
        query: jest.fn(),
      },
    }));

    const authMiddleware = require("../src/middleware/authMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/secure", authMiddleware, (req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorMiddleware);

    const response = await request(app).get("/secure");

    expect(response.status).toBe(401);
  });

  test("authMiddleware validates jwt and resolves field_agent actor", async () => {
    jest.resetModules();
    const verify = jest.fn().mockReturnValue({ id: 14, role: "fieldAgent" });
    const poolQuery = jest.fn().mockResolvedValue({ rows: [{ agent_id: 99 }] });

    jest.doMock("jsonwebtoken", () => ({
      verify,
    }));
    jest.doMock("../src/config/db", () => ({
      pool: {
        query: poolQuery,
      },
    }));

    const authMiddleware = require("../src/middleware/authMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/secure", authMiddleware, (req, res) => {
      res.status(200).json({ user: req.user });
    });
    app.use(errorMiddleware);

    const response = await request(app)
      .get("/secure")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(99);
    expect(response.body.user.role).toBe("field_agent");
  });

  test("authMiddleware rejects expired jwt", async () => {
    jest.resetModules();
    jest.doMock("jsonwebtoken", () => ({
      verify: jest.fn(() => {
        const error = new Error("expired");
        error.name = "TokenExpiredError";
        throw error;
      }),
    }));
    jest.doMock("../src/config/db", () => ({
      pool: {
        query: jest.fn(),
      },
    }));

    const authMiddleware = require("../src/middleware/authMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/secure", authMiddleware, (req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorMiddleware);

    const response = await request(app)
      .get("/secure")
      .set("Authorization", "Bearer expired-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Token has expired");
  });

  test("requireRole normalizes role names", async () => {
    jest.resetModules();
    const { requireRole } = require("../src/middleware/roleMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get(
      "/delivery-only",
      (req, res, next) => {
        req.user = { id: 1, role: "DeliveryPartner" };
        next();
      },
      requireRole("delivery_partner"),
      (req, res) => {
        res.status(200).json({ ok: true });
      }
    );
    app.use(errorMiddleware);

    const response = await request(app).get("/delivery-only");

    expect(response.status).toBe(200);
  });

  test("sanitizeMiddleware removes mongo-style operators", async () => {
    const sanitizeMiddleware = require("../src/middleware/sanitizeMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.use(express.json());
    app.post("/sanitize", sanitizeMiddleware, (req, res) => {
      res.status(200).json({ body: req.body });
    });
    app.use(errorMiddleware);

    const response = await request(app).post("/sanitize").send({
      email: "buyer@example.com",
      $where: "malicious",
      profile: {
        "bad.key": "blocked",
        city: "Addis",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.body).toEqual({
      email: "buyer@example.com",
      profile: {
        city: "Addis",
      },
    });
  });

  test("errorMiddleware returns invalid JSON payload message", async () => {
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.use(express.json());
    app.post("/json", (req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorMiddleware);

    const response = await request(app)
      .post("/json")
      .set("Content-Type", "application/json")
      .send('{"invalidJson":');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid JSON payload");
  });
});
