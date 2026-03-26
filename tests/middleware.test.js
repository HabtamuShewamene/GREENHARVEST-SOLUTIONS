const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

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

  test("authMiddleware rejects malformed authorization schemes", async () => {
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

    const wrongScheme = await request(app).get("/secure").set("Authorization", "Token abc");
    const missingToken = await request(app).get("/secure").set("Authorization", "Bearer");

    expect(wrongScheme.status).toBe(401);
    expect(missingToken.status).toBe(401);
  });

  test("authMiddleware returns 500 when JWT_SECRET is missing", async () => {
    jest.resetModules();
    jest.doMock("../src/config/db", () => ({
      pool: {
        query: jest.fn(),
      },
    }));

    const previousSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const authMiddleware = require("../src/middleware/authMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/secure", authMiddleware, (req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorMiddleware);

    const response = await request(app).get("/secure").set("Authorization", "Bearer any-token");

    process.env.JWT_SECRET = previousSecret;

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Authentication service is not configured");
  });

  test("authMiddleware validates jwt and resolves field_agent actor", async () => {
    jest.resetModules();
    const verify = jest.fn().mockReturnValue({ id: 14, role: "fieldAgent", token_type: "access" });
    const poolQuery = jest.fn().mockResolvedValue({ rows: [{ agent_id: 99 }] });

    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
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

  test("authMiddleware resolves buyer, farmer, and delivery_partner actor ids", async () => {
    jest.resetModules();
    const verify = jest
      .fn()
      .mockReturnValueOnce({ id: 10, role: "buyer", token_type: "access" })
      .mockReturnValueOnce({ id: 11, role: "farmer", token_type: "access" })
      .mockReturnValueOnce({ id: 12, role: "delivery_partner", token_type: "access" });

    const poolQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ buyer_id: 101 }] })
      .mockResolvedValueOnce({ rows: [{ farmer_id: 202 }] })
      .mockResolvedValueOnce({ rows: [{ delivery_id: 303 }] });

    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
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

    const buyer = await request(app).get("/secure").set("Authorization", "Bearer token-1");
    const farmer = await request(app).get("/secure").set("Authorization", "Bearer token-2");
    const delivery = await request(app).get("/secure").set("Authorization", "Bearer token-3");

    expect(buyer.status).toBe(200);
    expect(buyer.body.user.user_id).toBe(10);
    expect(buyer.body.user.id).toBe(101);
    expect(buyer.body.user.role).toBe("buyer");

    expect(farmer.status).toBe(200);
    expect(farmer.body.user.user_id).toBe(11);
    expect(farmer.body.user.id).toBe(202);
    expect(farmer.body.user.role).toBe("farmer");

    expect(delivery.status).toBe(200);
    expect(delivery.body.user.user_id).toBe(12);
    expect(delivery.body.user.id).toBe(303);
    expect(delivery.body.user.role).toBe("delivery_partner");
  });

  test("authMiddleware bypasses db lookups for admin and unknown roles", async () => {
    jest.resetModules();
    const verify = jest
      .fn()
      .mockReturnValueOnce({ id: 7, role: "admin", token_type: "access" })
      .mockReturnValueOnce({ id: 8, role: "support", token_type: "access" });
    const poolQuery = jest.fn();

    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
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

    const admin = await request(app).get("/secure").set("Authorization", "Bearer admin");
    const support = await request(app).get("/secure").set("Authorization", "Bearer support");

    expect(admin.status).toBe(200);
    expect(admin.body.user.user_id).toBe(7);
    expect(admin.body.user.id).toBe(7);
    expect(admin.body.user.role).toBe("admin");

    expect(support.status).toBe(200);
    expect(support.body.user.user_id).toBe(8);
    expect(support.body.user.id).toBe(8);
    expect(support.body.user.role).toBe("support");

    expect(poolQuery).not.toHaveBeenCalled();
  });

  test("authMiddleware rejects invalid token payload", async () => {
    jest.resetModules();
    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
      verify: jest.fn().mockReturnValue({ role: "buyer", token_type: "access" }),
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

    const response = await request(app).get("/secure").set("Authorization", "Bearer token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid token payload");
  });

  test("authMiddleware rejects expired jwt", async () => {
    jest.resetModules();
    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
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

  test("authMiddleware rejects invalid jwt", async () => {
    jest.resetModules();
    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
      verify: jest.fn(() => {
        const error = new Error("invalid");
        error.name = "JsonWebTokenError";
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

    const response = await request(app).get("/secure").set("Authorization", "Bearer bad-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid token");
  });

  test("authMiddleware returns 500 for unexpected jwt verification errors", async () => {
    jest.resetModules();
    jest.doMock("jsonwebtoken", () => ({
      ...jest.requireActual("jsonwebtoken"),
      verify: jest.fn(() => {
        const error = new Error("boom");
        error.name = "SomethingElse";
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

    const response = await request(app).get("/secure").set("Authorization", "Bearer token");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Authentication failed");
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

  test("requireRole rejects missing authenticated user", async () => {
    jest.resetModules();
    const { requireRole } = require("../src/middleware/roleMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/admin-only", requireRole("admin"), (req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorMiddleware);

    const response = await request(app).get("/admin-only");

    expect(response.status).toBe(401);
  });

  test("requireRole allows empty role list", async () => {
    jest.resetModules();
    const { requireRole } = require("../src/middleware/roleMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get(
      "/open",
      (req, res, next) => {
        req.user = { id: 1, role: "buyer" };
        next();
      },
      requireRole(),
      (req, res) => res.status(200).json({ ok: true })
    );
    app.use(errorMiddleware);

    const response = await request(app).get("/open");

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

  test("sanitizeMiddleware sanitizes query and params too", async () => {
    const sanitizeMiddleware = require("../src/middleware/sanitizeMiddleware");
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/sanitize/:id", sanitizeMiddleware, (req, res) => {
      res.status(200).json({ query: req.query, params: req.params });
    });
    app.use(errorMiddleware);

    const response = await request(app).get("/sanitize/12?bad.key=x&safe=yes");

    expect(response.status).toBe(200);
    expect(response.body.query).toEqual({ safe: "yes" });
    expect(response.body.params).toEqual({ id: "12" });
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

  test("errorMiddleware maps postgres codes and respects headersSent", async () => {
    const errorMiddleware = require("../src/middleware/errorMiddleware");

    const app = express();
    app.get("/duplicate", (req, res, next) => {
      const error = new Error("dup");
      error.code = "23505";
      next(error);
    });
    app.get("/format", (req, res, next) => {
      const error = new Error("format");
      error.code = "22P02";
      next(error);
    });
    app.get("/fk", (req, res, next) => {
      const error = new Error("fk");
      error.code = "23503";
      next(error);
    });
    app.use(errorMiddleware);

    const duplicate = await request(app).get("/duplicate");
    const format = await request(app).get("/format");
    const fk = await request(app).get("/fk");

    expect(duplicate.status).toBe(500);
    expect(duplicate.body.message).toBe("Record already exists");
    expect(format.body.message).toBe("Invalid input format");
    expect(fk.body.message).toBe("Referenced record does not exist");

    const next = jest.fn();
    const res = { headersSent: true };
    errorMiddleware(new Error("boom"), { originalUrl: "/", method: "GET" }, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("errorMiddleware masks unexpected 500 errors", async () => {
    const errorMiddleware = require("../src/middleware/errorMiddleware");
    const app = express();

    app.get("/boom", (req, res, next) => {
      next(new Error("secret internals"));
    });
    app.use(errorMiddleware);

    const response = await request(app).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal server error");
  });

  test("jwt utils sign and verify tokens, including invalid token type", async () => {
    jest.resetModules();
    jest.unmock("jsonwebtoken");
    jest.doMock("jsonwebtoken", () => jest.requireActual("jsonwebtoken"));
    const { signToken, verifyToken, verifyAccessToken } = require("../src/utils/jwt");

    const token = signToken({ id: 1, role: "buyer" }, { expiresIn: "1h" });
    const payload = verifyToken(token);

    expect(payload.id).toBe(1);
    expect(payload.role).toBe("buyer");

    const refreshLikeToken = jwt.sign(
      { id: 1, role: "buyer", token_type: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    expect(() => verifyAccessToken(refreshLikeToken)).toThrow("Invalid token type");
  });

  test("roles utils normalize aliases and validate roles", async () => {
    jest.resetModules();
    const { normalizeRole, isAllowedRole } = require("../src/utils/roles");

    expect(normalizeRole("fieldAgent")).toBe("field_agent");
    expect(normalizeRole("delivery-partner")).toBe("delivery_partner");
    expect(normalizeRole("ADMIN")).toBe("admin");
    expect(normalizeRole(null)).toBe("");
    expect(normalizeRole("")).toBe("");
    expect(isAllowedRole("fieldAgent")).toBe(true);
    expect(isAllowedRole("unknown-role")).toBe(false);
  });
});
