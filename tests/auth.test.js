const request = require("supertest");

const loadAuthService = () => {
  jest.resetModules();

  jest.doMock("../src/models/userModel", () => ({
    createUser: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
  }));

  jest.doMock("bcrypt", () => ({
    hash: jest.fn(),
    compare: jest.fn(),
  }));

  jest.doMock("../src/utils/jwt", () => ({
    signToken: jest.fn(),
  }));

  const authService = require("../src/services/authService");
  const userModel = require("../src/models/userModel");
  const bcrypt = require("bcrypt");
  const jwtUtils = require("../src/utils/jwt");

  return { authService, userModel, bcrypt, jwtUtils };
};

const buildAuthApp = (authServiceMock, authMiddlewareMock) => {
  jest.resetModules();
  jest.doMock("../src/services/authService", () => authServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => authMiddlewareMock);

  const authRoutes = require("../src/routes/authRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/auth", authRoutes);
};

describe("Auth tests", () => {
  describe("authService", () => {
    test("registerUser registers a valid user", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed-password");
      userModel.createUser.mockResolvedValue({
        id: 10,
        email: "alice@example.com",
        role: "buyer",
      });

      const user = await authService.registerUser({
        name: "Alice",
        email: "Alice@example.com",
        password: "Str0ng!Pass",
        role: "buyer",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("Str0ng!Pass", 10);
      expect(userModel.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice",
          email: "alice@example.com",
          role: "buyer",
        })
      );
      expect(user.id).toBe(10);
    });

    test("registerUser rejects invalid payload", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "bad-email",
          password: "weak",
          role: "buyer",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("registerUser rejects duplicate email", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({ id: 1, email: "alice@example.com" });

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "Str0ng!Pass",
          role: "buyer",
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "User already exists with this email",
      });
    });

    test("registerUser rejects invalid role", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "Str0ng!Pass",
          role: "manager",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid role provided",
      });
    });

    test("loginUser authenticates valid credentials", async () => {
      const { authService, userModel, bcrypt, jwtUtils } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 7,
        name: "Buyer User",
        email: "buyer@example.com",
        password: "hashed-password",
        role: "buyer",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      bcrypt.compare.mockResolvedValue(true);
      jwtUtils.signToken.mockReturnValue("jwt-token");

      const result = await authService.loginUser({
        email: "buyer@example.com",
        password: "Str0ng!Pass",
      });

      expect(result.token).toBe("jwt-token");
      expect(result.user.role).toBe("buyer");
    });

    test("loginUser rejects wrong password", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 7,
        email: "buyer@example.com",
        password: "hashed-password",
        role: "buyer",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.loginUser({
          email: "buyer@example.com",
          password: "wrong-password",
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid credentials",
      });
    });

    test("loginUser rejects missing fields", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.loginUser({
          email: "",
          password: "",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Email and password are required",
      });
    });

    test("getUserProfile rejects missing user", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserById.mockResolvedValue(null);

      await expect(authService.getUserProfile(999)).rejects.toMatchObject({
        statusCode: 404,
        message: "User not found",
      });
    });
  });

  describe("authController (unit)", () => {
    const loadAuthController = () => {
      jest.resetModules();

      const authServiceMock = {
        registerUser: jest.fn(),
        loginUser: jest.fn(),
        getUserProfile: jest.fn(),
      };

      const loggerMock = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      };

      jest.doMock("../src/services/authService", () => authServiceMock);
      jest.doMock("../src/utils/logger", () => loggerMock);

      const controller = require("../src/controllers/authController");
      return { controller, authServiceMock, loggerMock };
    };

    const createMockRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test("registerUser passes empty object fallback and masks unexpected errors", async () => {
      const { controller, authServiceMock, loggerMock } = loadAuthController();

      const res1 = createMockRes();
      authServiceMock.registerUser.mockResolvedValue(undefined);
      await controller.registerUser({ body: undefined }, res1);

      expect(authServiceMock.registerUser).toHaveBeenCalledWith({});
      expect(res1.status).toHaveBeenCalledWith(201);

      const res2 = createMockRes();
      authServiceMock.registerUser.mockRejectedValueOnce(new Error("db down"));
      await controller.registerUser({ body: { email: "buyer@example.com" } }, res2);

      expect(res2.status).toHaveBeenCalledWith(500);
      expect(res2.json).toHaveBeenCalledWith({ message: "Internal server error" });
      expect(loggerMock.error).toHaveBeenCalled();
    });

    test("loginUser forwards payload and only logs email metadata", async () => {
      const { controller, authServiceMock, loggerMock } = loadAuthController();

      authServiceMock.loginUser.mockResolvedValue({
        token: "jwt-token",
        user: { id: 1, role: "buyer" },
      });

      const res1 = createMockRes();
      await controller.loginUser(
        {
          body: { email: "buyer@example.com", password: "secret" },
        },
        res1
      );

      expect(authServiceMock.loginUser).toHaveBeenCalledWith({
        email: "buyer@example.com",
        password: "secret",
      });
      expect(res1.status).toHaveBeenCalledWith(200);

      const res2 = createMockRes();
      authServiceMock.loginUser.mockRejectedValueOnce(
        Object.assign(new Error("Invalid credentials"), { statusCode: 401 })
      );
      await controller.loginUser({ body: { email: "buyer@example.com" } }, res2);

      expect(res2.status).toHaveBeenCalledWith(401);
      expect(loggerMock.error).toHaveBeenLastCalledWith(
        "User login failed",
        expect.objectContaining({
          body: { email: "buyer@example.com" },
        })
      );
    });

    test("getUserProfile prefers user_id and falls back to id", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.getUserProfile.mockResolvedValueOnce({ id: 9 }).mockResolvedValueOnce({ id: 10 });

      const res1 = createMockRes();
      await controller.getUserProfile({ user: { user_id: 9, id: 99 } }, res1);
      expect(authServiceMock.getUserProfile).toHaveBeenNthCalledWith(1, 9);
      expect(res1.status).toHaveBeenCalledWith(200);

      const res2 = createMockRes();
      await controller.getUserProfile({ user: { id: 10 } }, res2);
      expect(authServiceMock.getUserProfile).toHaveBeenNthCalledWith(2, 10);
      expect(res2.status).toHaveBeenCalledWith(200);
    });

    test("getUserProfile maps service and unexpected errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      const res1 = createMockRes();
      authServiceMock.getUserProfile.mockRejectedValueOnce(
        Object.assign(new Error("User not found"), { statusCode: 404 })
      );
      await controller.getUserProfile({ user: { id: 9 } }, res1);
      expect(res1.status).toHaveBeenCalledWith(404);

      const res2 = createMockRes();
      authServiceMock.getUserProfile.mockRejectedValueOnce(new Error("boom"));
      await controller.getUserProfile({ user: { id: 9 } }, res2);
      expect(res2.status).toHaveBeenCalledWith(500);
      expect(res2.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
  });

  describe("auth routes", () => {
    let authServiceMock;
    let authMiddlewareMock;
    let app;

    beforeEach(() => {
      authServiceMock = {
        registerUser: jest.fn(),
        loginUser: jest.fn(),
        getUserProfile: jest.fn(),
      };

      authMiddlewareMock = (req, res, next) => {
        req.user = {
          id: 9,
          user_id: 9,
          role: "buyer",
        };
        next();
      };

      app = buildAuthApp(authServiceMock, authMiddlewareMock);
    });

    test("POST /api/auth/register succeeds for valid payload", async () => {
      authServiceMock.registerUser.mockResolvedValue(undefined);

      const response = await request(app).post("/api/auth/register").send({
        name: "Buyer One",
        email: "buyer@example.com",
        password: "Str0ng!Pass",
        role: "buyer",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User registered successfully");
    });

    test("POST /api/auth/register returns validation error", async () => {
      authServiceMock.registerUser.mockRejectedValue(
        Object.assign(new Error("email is required"), { statusCode: 400 })
      );

      const response = await request(app).post("/api/auth/register").send({
        name: "Buyer One",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("email is required");
    });

    test("POST /api/auth/login succeeds with valid credentials", async () => {
      authServiceMock.loginUser.mockResolvedValue({
        token: "jwt-token",
        user: {
          id: 3,
          role: "buyer",
        },
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "buyer@example.com",
        password: "Str0ng!Pass",
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe("jwt-token");
    });

    test("POST /api/auth/login rejects wrong password", async () => {
      authServiceMock.loginUser.mockRejectedValue(
        Object.assign(new Error("Invalid credentials"), { statusCode: 401 })
      );

      const response = await request(app).post("/api/auth/login").send({
        email: "buyer@example.com",
        password: "Wrong!Pass1",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid credentials");
    });

    test("GET /api/auth/profile returns the authenticated user", async () => {
      authServiceMock.getUserProfile.mockResolvedValue({
        id: 9,
        email: "buyer@example.com",
        role: "buyer",
      });

      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(9);
    });

    test("GET /api/auth/profile returns service error", async () => {
      authServiceMock.getUserProfile.mockRejectedValue(
        Object.assign(new Error("User not found"), { statusCode: 404 })
      );

      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });

    test("GET /api/auth/profile rejects unauthorized access", async () => {
      app = buildAuthApp(authServiceMock, (req, res) =>
        res.status(401).json({ message: "Authentication is required" })
      );

      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication is required");
    });
  });
});
