const request = require("supertest");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: reload authService with fresh mocks each time
// ─────────────────────────────────────────────────────────────────────────────
const loadAuthService = () => {
  jest.resetModules();

  jest.doMock("../src/models/userModel", () => ({
    clearPasswordResetToken: jest.fn(),
    createUser: jest.fn(),
    findAllUsers: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    findUserByIdWithPassword: jest.fn(),
    findUserByPasswordResetToken: jest.fn(),
    findUserByVerificationToken: jest.fn(),
    markEmailVerified: jest.fn(),
    storeEmailVerificationToken: jest.fn(),
    storePasswordResetToken: jest.fn(),
    updateLastLoginAt: jest.fn(),
    updateMfaPreference: jest.fn(),
    updateUserPassword: jest.fn(),
  }));

  jest.doMock("../src/models/authSecurityModel", () => ({
    consumeOtpChallenge: jest.fn(),
    createOtpChallenge: jest.fn(),
    createRefreshToken: jest.fn(),
    findOtpChallengeByHash: jest.fn(),
    findRefreshTokenByHash: jest.fn(),
    incrementOtpAttempts: jest.fn(),
    revokeRefreshTokenById: jest.fn(),
    revokeRefreshTokenFamily: jest.fn(),
    revokeRefreshTokensForUser: jest.fn(),
  }));

  jest.doMock("bcrypt", () => ({
    hash: jest.fn(),
    compare: jest.fn(),
  }));

  jest.doMock("../src/utils/jwt", () => ({
    getAccessTokenTtlMinutes: jest.fn(() => 15),
    signAccessToken: jest.fn(() => "access-token"),
  }));

  jest.doMock("../src/utils/tokenSecurity", () => ({
    addDays: jest.fn(() => new Date("2026-04-01T00:00:00.000Z")),
    addMinutes: jest.fn(() => new Date("2026-03-24T00:15:00.000Z")),
    generateNumericOtp: jest.fn(() => "123456"),
    generateOpaqueToken: jest.fn(),
    hasResolvableMailDomain: jest.fn(async () => true),
    hashToken: jest.fn((value) => `hash:${value}`),
    isExpired: jest.fn(() => false),
  }));

  jest.doMock("../src/services/emailService", () => ({
    sendMfaOtpEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  }));

  jest.doMock("../src/utils/logger", () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }));

  const authService = require("../src/services/authService");
  const userModel = require("../src/models/userModel");
  const authSecurityModel = require("../src/models/authSecurityModel");
  const bcrypt = require("bcrypt");
  const tokenSecurity = require("../src/utils/tokenSecurity");
  const emailService = require("../src/services/emailService");

  return { authService, userModel, authSecurityModel, bcrypt, tokenSecurity, emailService };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build an Express app with auth routes mounted
// ─────────────────────────────────────────────────────────────────────────────
const buildAuthApp = (authServiceMock, authMiddlewareMock) => {
  jest.resetModules();
  jest.doMock("../src/services/authService", () => authServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => authMiddlewareMock);

  const authRoutes = require("../src/routes/authRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");
  return createRouteApp("/api/auth", authRoutes);
};

// ─────────────────────────────────────────────────────────────────────────────
// authService – registerUser edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe("Auth extended tests", () => {
  describe("authService – registerUser validation", () => {
    test("rejects when required fields are missing", async () => {
      const { authService } = loadAuthService();

      // Missing name
      await expect(
        authService.registerUser({ email: "a@b.com", password: "Str0ng!Pass", role: "buyer" })
      ).rejects.toMatchObject({ statusCode: 400 });

      // Missing email
      await expect(
        authService.registerUser({ name: "Alice", password: "Str0ng!Pass", role: "buyer" })
      ).rejects.toMatchObject({ statusCode: 400 });

      // Missing password
      await expect(
        authService.registerUser({ name: "Alice", email: "a@b.com", role: "buyer" })
      ).rejects.toMatchObject({ statusCode: 400 });

      // Missing role
      await expect(
        authService.registerUser({ name: "Alice", email: "a@b.com", password: "Str0ng!Pass" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects an invalid email format", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "not-an-email",
          password: "Str0ng!Pass",
          role: "buyer",
        })
      ).rejects.toMatchObject({ statusCode: 400, message: "A valid email address is required" });
    });

    test("rejects an invalid role", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "Str0ng!Pass",
          role: "superuser",
        })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid role provided" });
    });

    test("rejects a weak password", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "weak",
          role: "buyer",
        })
      ).rejects.toMatchObject({ statusCode: 400 });

      // Only lowercas + digits – missing uppercase and special char
      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "password123",
          role: "buyer",
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when email is already registered", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({ id: 1, email: "alice@example.com" });

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "Str0ng!Pass",
          role: "buyer",
        })
      ).rejects.toMatchObject({ statusCode: 409, message: "User already exists with this email" });
    });

    test("rejects invalid backup_email if provided", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.registerUser({
          name: "Alice",
          email: "alice@example.com",
          password: "Str0ng!Pass",
          role: "buyer",
          backup_email: "not-valid",
        })
      ).rejects.toMatchObject({ statusCode: 400, message: "backup_email must be a valid email address" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – loginUser edge cases
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – loginUser validation", () => {
    test("rejects when email or password are missing", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.loginUser({ email: "buyer@example.com" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Email and password are required" });

      await expect(
        authService.loginUser({ password: "Str0ng!Pass" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects an invalid email format on login", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.loginUser({ email: "bad-email", password: "Str0ng!Pass" })
      ).rejects.toMatchObject({ statusCode: 400, message: "A valid email address is required" });
    });

    test("rejects when user is not found", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue(null);

      await expect(
        authService.loginUser({ email: "noone@example.com", password: "Str0ng!Pass" })
      ).rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
    });

    test("rejects when the password does not match", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 7,
        email: "buyer@example.com",
        password: "hashed-password",
        role: "buyer",
        is_verified: true,
        mfa_enabled: false,
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.loginUser({ email: "buyer@example.com", password: "WrongPass1!" })
      ).rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – refreshSession edge cases
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – refreshSession validation", () => {
    test("rejects when refresh_token is absent or blank", async () => {
      const { authService } = loadAuthService();

      await expect(authService.refreshSession({})).rejects.toMatchObject({
        statusCode: 400,
        message: "refresh_token is required",
      });

      await expect(authService.refreshSession({ refresh_token: "   " })).rejects.toMatchObject({
        statusCode: 400,
        message: "refresh_token is required",
      });
    });

    test("rejects when the token is not found in the database", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(
        authService.refreshSession({ refresh_token: "unknown-token" })
      ).rejects.toMatchObject({ statusCode: 401, message: "Invalid refresh token" });
    });

    test("rejects when the refresh token is expired", async () => {
      const { authService, authSecurityModel, tokenSecurity } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue({
        id: 3,
        user_id: 9,
        family_id: "family-1",
        revoked_at: null,
        expires_at: new Date("2025-01-01T00:00:00.000Z"),
      });
      tokenSecurity.isExpired.mockReturnValueOnce(true);

      await expect(
        authService.refreshSession({ refresh_token: "expired-token" })
      ).rejects.toMatchObject({ statusCode: 401, message: "Refresh token expired" });

      expect(authSecurityModel.revokeRefreshTokenById).toHaveBeenCalled();
    });

    test("rejects when the associated user no longer exists", async () => {
      const { authService, authSecurityModel, userModel } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue({
        id: 3,
        user_id: 99,
        family_id: "family-1",
        revoked_at: null,
        expires_at: new Date("2026-04-01T00:00:00.000Z"),
      });
      userModel.findUserById.mockResolvedValue(null);

      await expect(
        authService.refreshSession({ refresh_token: "valid-token" })
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – forgotPassword validation
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – forgotPassword validation", () => {
    test("rejects when email is missing", async () => {
      const { authService } = loadAuthService();

      await expect(authService.forgotPassword({})).rejects.toMatchObject({
        statusCode: 400,
        message: "Email is required",
      });
    });

    test("rejects an invalid email format", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.forgotPassword({ email: "not-valid" })
      ).rejects.toMatchObject({ statusCode: 400, message: "A valid email address is required" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – resetPassword validation
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – resetPassword validation", () => {
    test("rejects when token or new_password is missing", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.resetPassword({ new_password: "N3w!Password" })
      ).rejects.toMatchObject({ statusCode: 400, message: "token and new_password are required" });

      await expect(
        authService.resetPassword({ token: "some-token" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects a weak new_password", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.resetPassword({ token: "some-token", new_password: "weak" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when reset token returns no user (null)", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByPasswordResetToken.mockResolvedValue(null);

      await expect(
        authService.resetPassword({ token: "bad-token", new_password: "N3w!Password" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid or expired reset token" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – verifyEmail validation
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – verifyEmail validation", () => {
    test("rejects when token is missing or blank", async () => {
      const { authService } = loadAuthService();

      await expect(authService.verifyEmail({})).rejects.toMatchObject({
        statusCode: 400,
        message: "Verification token is required",
      });

      await expect(authService.verifyEmail({ token: "" })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("rejects when verification token is not found", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByVerificationToken.mockResolvedValue(null);

      await expect(
        authService.verifyEmail({ token: "missing-token" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid or expired verification token" });
    });

    test("rejects when verification token is expired", async () => {
      const { authService, userModel, tokenSecurity } = loadAuthService();

      userModel.findUserByVerificationToken.mockResolvedValue({
        id: 5,
        verification_token_expiry: new Date("2025-01-01T00:00:00.000Z"),
      });
      tokenSecurity.isExpired.mockReturnValueOnce(true);

      await expect(
        authService.verifyEmail({ token: "expired-token" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid or expired verification token" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – verifyOtp edge cases
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – verifyOtp validation", () => {
    test("rejects when challenge_token or otp is missing", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.verifyOtp({ otp: "123456" })
      ).rejects.toMatchObject({ statusCode: 400, message: "challenge_token and otp are required" });

      await expect(
        authService.verifyOtp({ challenge_token: "tok" })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when OTP challenge is not found or expired", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      // Not found
      authSecurityModel.findOtpChallengeByHash.mockResolvedValue(null);

      await expect(
        authService.verifyOtp({ challenge_token: "tok", otp: "111111" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid or expired OTP challenge" });
    });

    test("rejects when the challenge is already consumed", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findOtpChallengeByHash.mockResolvedValue({
        id: 2,
        user_id: 8,
        otp_hash: "hash:123456",
        attempts: 0,
        consumed_at: new Date(),
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });

      await expect(
        authService.verifyOtp({ challenge_token: "tok", otp: "123456" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid or expired OTP challenge" });
    });

    test("locks OTP after 5 attempts", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findOtpChallengeByHash.mockResolvedValue({
        id: 2,
        user_id: 8,
        otp_hash: "hash:123456",
        attempts: 5,
        consumed_at: null,
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });

      await expect(
        authService.verifyOtp({ challenge_token: "tok", otp: "123456" })
      ).rejects.toMatchObject({ statusCode: 400, message: "OTP challenge has been locked" });

      expect(authSecurityModel.consumeOtpChallenge).toHaveBeenCalledWith(2);
    });

    test("increments attempts on wrong OTP", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findOtpChallengeByHash.mockResolvedValue({
        id: 2,
        user_id: 8,
        otp_hash: "hash:999999",   // correct hash is for "999999"
        attempts: 1,
        consumed_at: null,
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });

      // hashToken mock returns "hash:<value>", so "hash:123456" !== "hash:999999"
      await expect(
        authService.verifyOtp({ challenge_token: "tok", otp: "123456" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid OTP" });

      expect(authSecurityModel.incrementOtpAttempts).toHaveBeenCalledWith(2);
    });

    test("rejects when user is not found after consuming OTP", async () => {
      const { authService, authSecurityModel, userModel } = loadAuthService();

      authSecurityModel.findOtpChallengeByHash.mockResolvedValue({
        id: 2,
        user_id: 999,
        otp_hash: "hash:123456",
        attempts: 0,
        consumed_at: null,
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });
      userModel.findUserById.mockResolvedValue(null);

      await expect(
        authService.verifyOtp({ challenge_token: "tok", otp: "123456" })
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found" });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – logoutUser edge cases
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – logoutUser edge cases", () => {
    test("all_devices logout requires an authenticated actor with user_id", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.logoutUser({ all_devices: true, actor: null })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Authentication is required for logout from all devices",
      });

      await expect(
        authService.logoutUser({ all_devices: true, actor: { id: 9 } }) // missing user_id
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    test("single-session logout with no stored token still returns logout_all false", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue(null);

      const result = await authService.logoutUser({ refresh_token: "orphan-token" });

      expect(result.logout_all).toBe(false);
      expect(authSecurityModel.revokeRefreshTokenById).not.toHaveBeenCalled();
    });

    test("single-session logout without a refresh_token returns logout_all false", async () => {
      const { authService } = loadAuthService();

      const result = await authService.logoutUser({});
      expect(result.logout_all).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – updateMfaPreference
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – updateMfaPreference", () => {
    test("rejects when password is missing", async () => {
      const { authService } = loadAuthService();

      await expect(
        authService.updateMfaPreference({ user_id: 9, enabled: true })
      ).rejects.toMatchObject({ statusCode: 400, message: "password is required" });

      await expect(
        authService.updateMfaPreference({ user_id: 9, password: "   ", enabled: true })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when user is not found", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByIdWithPassword.mockResolvedValue(null);

      await expect(
        authService.updateMfaPreference({ user_id: 999, password: "Str0ng!Pass", enabled: true })
      ).rejects.toMatchObject({ statusCode: 404, message: "User not found" });
    });

    test("rejects when password is incorrect", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByIdWithPassword.mockResolvedValue({
        id: 9,
        password: "hashed-password",
        is_verified: true,
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.updateMfaPreference({ user_id: 9, password: "WrongPass1!", enabled: true })
      ).rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
    });

    test("rejects enabling MFA on unverified email", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByIdWithPassword.mockResolvedValue({
        id: 9,
        password: "hashed-password",
        is_verified: false,
      });
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        authService.updateMfaPreference({ user_id: 9, password: "Str0ng!Pass", enabled: true })
      ).rejects.toMatchObject({ statusCode: 400, message: "Verify your email before enabling MFA" });
    });

    test("successfully enables MFA for a verified user", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByIdWithPassword.mockResolvedValue({
        id: 9,
        password: "hashed-password",
        is_verified: true,
      });
      bcrypt.compare.mockResolvedValue(true);
      userModel.updateMfaPreference.mockResolvedValue(undefined);

      const result = await authService.updateMfaPreference({
        user_id: 9,
        password: "Str0ng!Pass",
        enabled: true,
      });

      expect(result.mfa_enabled).toBe(true);
      expect(userModel.updateMfaPreference).toHaveBeenCalledWith({ user_id: 9, enabled: true });
    });

    test("successfully disables MFA", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByIdWithPassword.mockResolvedValue({
        id: 9,
        password: "hashed-password",
        is_verified: true,
      });
      bcrypt.compare.mockResolvedValue(true);
      userModel.updateMfaPreference.mockResolvedValue(undefined);

      const result = await authService.updateMfaPreference({
        user_id: 9,
        password: "Str0ng!Pass",
        enabled: false,
      });

      expect(result.mfa_enabled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authService – getUserProfile
  // ─────────────────────────────────────────────────────────────────────────
  describe("authService – getUserProfile", () => {
    test("rejects when user is not found", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserById.mockResolvedValue(null);

      await expect(authService.getUserProfile(999)).rejects.toMatchObject({
        statusCode: 404,
        message: "User not found",
      });
    });

    test("returns the user when found", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserById.mockResolvedValue({ id: 9, email: "buyer@example.com" });

      const user = await authService.getUserProfile(9);
      expect(user.id).toBe(9);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // authController – unit tests for uncovered endpoints
  // ─────────────────────────────────────────────────────────────────────────
  describe("authController – unit tests", () => {
    const loadAuthController = () => {
      jest.resetModules();

      const authServiceMock = {
        forgotPassword: jest.fn(),
        getUserProfile: jest.fn(),
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
        refreshSession: jest.fn(),
        registerUser: jest.fn(),
        resetPassword: jest.fn(),
        updateMfaPreference: jest.fn(),
        verifyEmail: jest.fn(),
        verifyOtp: jest.fn(),
      };

      const loggerMock = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };

      jest.doMock("../src/services/authService", () => authServiceMock);
      jest.doMock("../src/utils/logger", () => loggerMock);
      jest.doMock("../src/utils/cookies", () => ({
        clearRefreshTokenCookie: jest.fn(),
        getRefreshTokenFromRequest: jest.fn(() => "refresh-token"),
        setRefreshTokenCookie: jest.fn(),
        shouldExposeRefreshToken: jest.fn(() => true),
      }));

      const controller = require("../src/controllers/authController");
      return { controller, authServiceMock, loggerMock };
    };

    const createMockRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test("registerUser returns 201 on success", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.registerUser.mockResolvedValue({
        user: { id: 1, email: "a@b.com", role: "buyer" },
        requires_email_verification: true,
      });

      const res = createMockRes();
      await controller.registerUser({ body: { name: "Alice", email: "a@b.com", password: "Str0ng!Pass", role: "buyer" } }, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("registerUser maps service errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.registerUser.mockRejectedValue(
        Object.assign(new Error("User already exists with this email"), { statusCode: 409 })
      );

      const res = createMockRes();
      await controller.registerUser({ body: { email: "dup@b.com" } }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "User already exists with this email" });
    });

    test("loginUser returns 200 with session response (non-MFA)", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.loginUser.mockResolvedValue({
        access_token: "access-token",
        token: "access-token",
        token_type: "Bearer",
        expires_in_minutes: 15,
        refresh_token: "refresh-token",
        user: { id: 3, role: "buyer" },
      });

      const reqFake = {
        body: { email: "buyer@example.com", password: "Str0ng!Pass" },
        ip: "127.0.0.1",
        get: jest.fn(() => "jest-agent"),
      };
      const res = createMockRes();
      await controller.loginUser(reqFake, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("loginUser maps 401 when credentials are invalid", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.loginUser.mockRejectedValue(
        Object.assign(new Error("Invalid credentials"), { statusCode: 401 })
      );

      const reqFake = {
        body: { email: "buyer@example.com", password: "WrongPass1!" },
        ip: "127.0.0.1",
        get: jest.fn(),
      };
      const res = createMockRes();
      await controller.loginUser(reqFake, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    test("logoutUser returns all-devices message when logout_all is true", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.logoutUser.mockResolvedValue({ logout_all: true });

      const res = createMockRes();
      await controller.logoutUser(
        { body: { all_devices: true }, user: { id: 9, user_id: 9 } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Logged out from all devices successfully" })
      );
    });

    test("logoutUser maps service error", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.logoutUser.mockRejectedValue(
        Object.assign(new Error("Authentication is required"), { statusCode: 401 })
      );

      const res = createMockRes();
      await controller.logoutUser({ body: { all_devices: true }, user: null }, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("enableMfa delegates to updateMfaPreference with enabled=true", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.updateMfaPreference.mockResolvedValue({ mfa_enabled: true });

      const res = createMockRes();
      await controller.enableMfa(
        { user: { id: 9, user_id: 9 }, body: { password: "Str0ng!Pass" } },
        res
      );

      expect(authServiceMock.updateMfaPreference).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "MFA enabled successfully" })
      );
    });

    test("enableMfa maps service errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.updateMfaPreference.mockRejectedValue(
        Object.assign(new Error("password is required"), { statusCode: 400 })
      );

      const res = createMockRes();
      await controller.enableMfa({ user: { id: 9, user_id: 9 }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "password is required" });
    });

    test("disableMfa delegates to updateMfaPreference with enabled=false", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.updateMfaPreference.mockResolvedValue({ mfa_enabled: false });

      const res = createMockRes();
      await controller.disableMfa(
        { user: { id: 9, user_id: 9 }, body: { password: "Str0ng!Pass" } },
        res
      );

      expect(authServiceMock.updateMfaPreference).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "MFA disabled successfully" })
      );
    });

    test("disableMfa maps unexpected 500 errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.updateMfaPreference.mockRejectedValue(new Error("db down"));

      const res = createMockRes();
      await controller.disableMfa({ user: { id: 9, user_id: 9 }, body: { password: "Str0ng!Pass" } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });

    test("getUserProfile maps 404 when user is not found", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.getUserProfile.mockRejectedValue(
        Object.assign(new Error("User not found"), { statusCode: 404 })
      );

      const res = createMockRes();
      await controller.getUserProfile({ user: { id: 9, user_id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("verifyEmail maps service errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.verifyEmail.mockRejectedValue(
        Object.assign(new Error("Invalid or expired verification token"), { statusCode: 400 })
      );

      const res = createMockRes();
      await controller.verifyEmail({ query: { token: "bad-token" } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("resetPassword clears the cookie and returns 200", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.resetPassword.mockResolvedValue({ message: "Password reset successfully" });

      const res = createMockRes();
      await controller.resetPassword({ body: { token: "tok", new_password: "N3w!Password" } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("verifyOtp maps service errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.verifyOtp.mockRejectedValue(
        Object.assign(new Error("Invalid OTP"), { statusCode: 400 })
      );

      const reqFake = {
        body: { challenge_token: "tok", otp: "000000" },
        ip: "127.0.0.1",
        get: jest.fn(() => null),
      };
      const res = createMockRes();
      await controller.verifyOtp(reqFake, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid OTP" });
    });

    test("refreshSession maps service errors", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.refreshSession.mockRejectedValue(
        Object.assign(new Error("Invalid refresh token"), { statusCode: 401 })
      );

      const reqFake = { body: {}, ip: "127.0.0.1", get: jest.fn() };
      const res = createMockRes();
      await controller.refreshSession(reqFake, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("forgotPassword maps 400 when email is invalid", async () => {
      const { controller, authServiceMock } = loadAuthController();

      authServiceMock.forgotPassword.mockRejectedValue(
        Object.assign(new Error("Email is required"), { statusCode: 400 })
      );

      const res = createMockRes();
      await controller.forgotPassword({ body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // auth routes – register / MFA endpoints
  // ─────────────────────────────────────────────────────────────────────────
  describe("auth routes – register and MFA endpoints", () => {
    let authServiceMock;
    let authMiddlewareMock;
    let app;

    beforeEach(() => {
      authServiceMock = {
        forgotPassword: jest.fn(),
        getUserProfile: jest.fn(),
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
        refreshSession: jest.fn(),
        registerUser: jest.fn(),
        resetPassword: jest.fn(),
        updateMfaPreference: jest.fn(),
        verifyEmail: jest.fn(),
        verifyOtp: jest.fn(),
      };

      authMiddlewareMock = (req, res, next) => {
        req.user = { id: 9, user_id: 9, role: "buyer" };
        next();
      };

      app = buildAuthApp(authServiceMock, authMiddlewareMock);
    });

    test("POST /api/auth/register returns 201 on success", async () => {
      authServiceMock.registerUser.mockResolvedValue({
        user: { id: 1, email: "a@b.com", role: "buyer" },
        requires_email_verification: true,
      });

      const response = await request(app).post("/api/auth/register").send({
        name: "Alice",
        email: "alice@example.com",
        password: "Str0ng!Pass",
        role: "buyer",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("registered");
    });

    test("POST /api/auth/register returns 409 for duplicate email", async () => {
      authServiceMock.registerUser.mockRejectedValue(
        Object.assign(new Error("User already exists with this email"), { statusCode: 409 })
      );

      const response = await request(app).post("/api/auth/register").send({
        name: "Alice",
        email: "dup@example.com",
        password: "Str0ng!Pass",
        role: "buyer",
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("User already exists with this email");
    });

    test("POST /api/auth/register returns 400 for missing fields", async () => {
      authServiceMock.registerUser.mockRejectedValue(
        Object.assign(new Error("name, email are required"), { statusCode: 400 })
      );

      const response = await request(app).post("/api/auth/register").send({});

      expect(response.status).toBe(400);
    });

    test("POST /api/auth/register returns 400 for invalid role", async () => {
      authServiceMock.registerUser.mockRejectedValue(
        Object.assign(new Error("Invalid role provided"), { statusCode: 400 })
      );

      const response = await request(app).post("/api/auth/register").send({
        name: "Alice",
        email: "alice@example.com",
        password: "Str0ng!Pass",
        role: "hacker",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid role provided");
    });

    test("POST /api/auth/login returns 401 for wrong credentials via route", async () => {
      authServiceMock.loginUser.mockRejectedValue(
        Object.assign(new Error("Invalid credentials"), { statusCode: 401 })
      );

      const response = await request(app).post("/api/auth/login").send({
        email: "buyer@example.com",
        password: "WrongPass1!",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid credentials");
    });

    test("POST /api/auth/login returns 403 when email not verified", async () => {
      authServiceMock.loginUser.mockRejectedValue(
        Object.assign(new Error("Please verify your email before logging in"), { statusCode: 403 })
      );

      const response = await request(app).post("/api/auth/login").send({
        email: "unverified@example.com",
        password: "Str0ng!Pass",
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Please verify your email before logging in");
    });

    test("POST /api/auth/logout with all_devices=true clears all sessions", async () => {
      authServiceMock.logoutUser.mockResolvedValue({ logout_all: true });

      const response = await request(app)
        .post("/api/auth/logout")
        .send({ all_devices: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out from all devices successfully");
    });

    test("POST /api/auth/forgot-password returns 400 for blank email", async () => {
      authServiceMock.forgotPassword.mockRejectedValue(
        Object.assign(new Error("Email is required"), { statusCode: 400 })
      );

      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({});

      expect(response.status).toBe(400);
    });

    test("POST /api/auth/reset-password returns 400 for missing token", async () => {
      authServiceMock.resetPassword.mockRejectedValue(
        Object.assign(new Error("token and new_password are required"), { statusCode: 400 })
      );

      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({ new_password: "N3w!Password" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("token and new_password are required");
    });

    test("GET /api/auth/verify-email returns 400 for missing token", async () => {
      authServiceMock.verifyEmail.mockRejectedValue(
        Object.assign(new Error("Verification token is required"), { statusCode: 400 })
      );

      const response = await request(app).get("/api/auth/verify-email");

      expect(response.status).toBe(400);
    });

    test("POST /api/auth/mfa/enable delegates to controller", async () => {
      authServiceMock.updateMfaPreference.mockResolvedValue({ mfa_enabled: true });

      const response = await request(app)
        .post("/api/auth/mfa/enable")
        .send({ password: "Str0ng!Pass" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("MFA enabled successfully");
    });

    test("POST /api/auth/mfa/enable returns 400 when password missing", async () => {
      authServiceMock.updateMfaPreference.mockRejectedValue(
        Object.assign(new Error("password is required"), { statusCode: 400 })
      );

      const response = await request(app)
        .post("/api/auth/mfa/enable")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("password is required");
    });

    test("POST /api/auth/mfa/disable delegates to controller", async () => {
      authServiceMock.updateMfaPreference.mockResolvedValue({ mfa_enabled: false });

      const response = await request(app)
        .post("/api/auth/mfa/disable")
        .send({ password: "Str0ng!Pass" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("MFA disabled successfully");
    });

    test("POST /api/auth/mfa/disable returns 401 for wrong password", async () => {
      authServiceMock.updateMfaPreference.mockRejectedValue(
        Object.assign(new Error("Invalid credentials"), { statusCode: 401 })
      );

      const response = await request(app)
        .post("/api/auth/mfa/disable")
        .send({ password: "WrongPass1!" });

      expect(response.status).toBe(401);
    });

    test("GET /api/auth/me returns user profile", async () => {
      authServiceMock.getUserProfile.mockResolvedValue({
        id: 9,
        email: "buyer@example.com",
        role: "buyer",
      });

      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(9);
    });

    test("POST /api/auth/verify-otp returns 400 for locked OTP", async () => {
      authServiceMock.verifyOtp.mockRejectedValue(
        Object.assign(new Error("OTP challenge has been locked"), { statusCode: 400 })
      );

      const response = await request(app).post("/api/auth/verify-otp").send({
        challenge_token: "tok",
        otp: "000000",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("OTP challenge has been locked");
    });
  });
});
