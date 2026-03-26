const request = require("supertest");

const {
  closeIntegrationDatabase,
  createUser,
  initializeIntegrationDatabase,
  queryOne,
  queryRows,
  resetIntegrationDatabase,
} = require("../helpers/integrationDb");

const hasRealTestDb =
  Boolean(process.env.TEST_DB_URL) &&
  !/your_database_password/i.test(process.env.TEST_DB_URL) &&
  !/example/i.test(process.env.TEST_DB_URL);

const describeIntegration = hasRealTestDb ? describe : describe.skip;

describeIntegration("Auth integration tests", () => {
  const password = "Str0ng!Pass1!";

  let app;
  let appPool;
  let adminPool;

  const authHeader = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    adminPool = await initializeIntegrationDatabase();

    jest.resetModules();
    app = require("../../src/app");
    appPool = require("../../src/config/db").pool;
  });

  beforeEach(async () => {
    await resetIntegrationDatabase(adminPool);
  });

  afterAll(async () => {
    if (appPool) {
      await appPool.end();
    }

    if (adminPool) {
      await closeIntegrationDatabase(adminPool);
    }
  });

  describe("Register and login flow", () => {
    test("registers a buyer, logs in after verification, refreshes the session, and accesses a protected route", async () => {
      const registerResponse = await request(app).post("/api/auth/register").send({
        name: "Integration Buyer",
        email: "integration-buyer@test.local",
        password,
        role: "buyer",
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe("integration-buyer@test.local");
      expect(registerResponse.body.requires_email_verification).toBe(true);

      const registeredUser = await queryOne(
        adminPool,
        `
          SELECT user_id, email, is_verified, verification_token_hash
          FROM users
          WHERE email = $1
        `,
        ["integration-buyer@test.local"]
      );

      expect(registeredUser).toBeTruthy();
      expect(registeredUser.is_verified).toBe(false);
      expect(registeredUser.verification_token_hash).toBeTruthy();

      await adminPool.query(`UPDATE users SET is_verified = TRUE WHERE user_id = $1`, [
        registeredUser.user_id,
      ]);

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "integration-buyer@test.local",
        password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.access_token).toBeTruthy();
      expect(loginResponse.body.refresh_token).toBeTruthy();
      expect(loginResponse.body.user.email).toBe("integration-buyer@test.local");

      const refreshTokenRow = await queryOne(
        adminPool,
        `
          SELECT user_id, family_id, revoked_at
          FROM refresh_tokens
          WHERE user_id = $1
          ORDER BY id DESC
          LIMIT 1
        `,
        [registeredUser.user_id]
      );

      expect(refreshTokenRow).toBeTruthy();
      expect(Number(refreshTokenRow.user_id)).toBe(Number(registeredUser.user_id));
      expect(refreshTokenRow.family_id).toBeTruthy();
      expect(refreshTokenRow.revoked_at).toBeNull();

      const profileResponse = await request(app)
        .get("/api/auth/me")
        .set(authHeader(loginResponse.body.access_token));

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe("integration-buyer@test.local");
      expect(profileResponse.body.user.role).toBe("buyer");

      const refreshResponse = await request(app).post("/api/auth/refresh").send({
        refresh_token: loginResponse.body.refresh_token,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.access_token).toBeTruthy();
      expect(refreshResponse.body.refresh_token).toBeTruthy();
      expect(refreshResponse.body.refresh_token).not.toBe(loginResponse.body.refresh_token);

      const refreshRows = await queryRows(
        adminPool,
        `
          SELECT revoked_at, replaced_by_token_hash
          FROM refresh_tokens
          WHERE user_id = $1
          ORDER BY id ASC
        `,
        [registeredUser.user_id]
      );

      expect(refreshRows).toHaveLength(2);
      expect(refreshRows[0].revoked_at).toBeTruthy();
      expect(refreshRows[0].replaced_by_token_hash).toBeTruthy();
      expect(refreshRows[1].revoked_at).toBeNull();
    });
  });

  describe("Invalid auth scenarios", () => {
    test("rejects login with a wrong password", async () => {
      await createUser(adminPool, {
        name: "Buyer User",
        email: "buyer-auth@test.local",
        password,
        role: "buyer",
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "buyer-auth@test.local",
        password: "WrongPass1!",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid credentials");
    });

    test("rejects a protected route without a token", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    test("rejects a protected route with an invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set(authHeader("not-a-real-token"));

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });
  });
});
