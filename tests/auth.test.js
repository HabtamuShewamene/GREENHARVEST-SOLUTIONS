const request = require("supertest");

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
  const jwtUtils = require("../src/utils/jwt");
  const tokenSecurity = require("../src/utils/tokenSecurity");
  const emailService = require("../src/services/emailService");

  return {
    authSecurityModel,
    authService,
    bcrypt,
    emailService,
    jwtUtils,
    tokenSecurity,
    userModel,
  };
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
    test("registerUser creates an unverified user and sends verification email", async () => {
      const { authService, userModel, bcrypt, tokenSecurity, emailService } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed-password");
      userModel.createUser.mockResolvedValue({
        id: 10,
        name: "Alice",
        email: "alice@example.com",
        role: "buyer",
        is_verified: false,
        mfa_enabled: false,
      });
      tokenSecurity.generateOpaqueToken.mockReturnValueOnce("verify-token");

      const result = await authService.registerUser({
        name: "Alice",
        email: "Alice@example.com",
        password: "Str0ng!Pass",
        role: "buyer",
      });

      expect(userModel.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice",
          email: "alice@example.com",
          role: "buyer",
        })
      );
      expect(userModel.storeEmailVerificationToken).toHaveBeenCalledWith({
        user_id: 10,
        token_hash: "hash:verify-token",
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.requires_email_verification).toBe(true);
    });

    test("loginUser creates access and refresh tokens for verified users", async () => {
      const {
        authService,
        userModel,
        authSecurityModel,
        bcrypt,
        tokenSecurity,
      } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 7,
        name: "Buyer User",
        email: "buyer@example.com",
        password: "hashed-password",
        role: "buyer",
        role_name: "buyer",
        is_verified: true,
        mfa_enabled: false,
      });
      bcrypt.compare.mockResolvedValue(true);
      tokenSecurity.generateOpaqueToken
        .mockReturnValueOnce("refresh-token")
        .mockReturnValueOnce("family-id");

      const result = await authService.loginUser({
        email: "buyer@example.com",
        password: "Str0ng!Pass",
        ip: "127.0.0.1",
        userAgent: "jest",
      });

      expect(authSecurityModel.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 7,
          token_hash: "hash:refresh-token",
          family_id: "family-id",
        })
      );
      expect(userModel.updateLastLoginAt).toHaveBeenCalledWith(7);
      expect(result.access_token).toBe("access-token");
      expect(result.refresh_token).toBe("refresh-token");
    });

    test("loginUser blocks unverified users when verification is required", async () => {
      const { authService, userModel, bcrypt } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 7,
        email: "buyer@example.com",
        password: "hashed-password",
        role: "buyer",
        is_verified: false,
        mfa_enabled: false,
      });
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        authService.loginUser({
          email: "buyer@example.com",
          password: "Str0ng!Pass",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Please verify your email before logging in",
      });
    });

    test("loginUser starts MFA flow when enabled", async () => {
      const { authService, userModel, authSecurityModel, bcrypt, tokenSecurity, emailService } =
        loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 7,
        name: "Buyer User",
        email: "buyer@example.com",
        password: "hashed-password",
        role: "buyer",
        is_verified: true,
        mfa_enabled: true,
      });
      bcrypt.compare.mockResolvedValue(true);
      tokenSecurity.generateOpaqueToken.mockReturnValueOnce("challenge-token");

      const result = await authService.loginUser({
        email: "buyer@example.com",
        password: "Str0ng!Pass",
      });

      expect(authSecurityModel.createOtpChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 7,
          challenge_hash: "hash:challenge-token",
          otp_hash: "hash:123456",
        })
      );
      expect(emailService.sendMfaOtpEmail).toHaveBeenCalled();
      expect(result.mfa_required).toBe(true);
      expect(result.challenge_token).toBe("challenge-token");
    });

    test("refreshSession rotates refresh tokens", async () => {
      const { authService, authSecurityModel, userModel, tokenSecurity } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue({
        id: 3,
        user_id: 9,
        family_id: "family-1",
        revoked_at: null,
        expires_at: new Date("2026-04-01T00:00:00.000Z"),
      });
      userModel.findUserById.mockResolvedValue({
        id: 9,
        name: "Buyer",
        email: "buyer@example.com",
        role: "buyer",
        is_verified: true,
        mfa_enabled: false,
      });
      tokenSecurity.generateOpaqueToken.mockReturnValueOnce("refresh-token-2");

      const result = await authService.refreshSession({
        refresh_token: "refresh-token-1",
      });

      expect(authSecurityModel.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 9,
          token_hash: "hash:refresh-token-2",
          family_id: "family-1",
        })
      );
      expect(authSecurityModel.revokeRefreshTokenById).toHaveBeenCalledWith(3, {
        replaced_by_token_hash: "hash:refresh-token-2",
        revoked_reason: "rotated",
      });
      expect(result.refresh_token).toBe("refresh-token-2");
    });

    test("refreshSession detects refresh token reuse", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue({
        id: 3,
        user_id: 9,
        family_id: "family-1",
        revoked_at: new Date("2026-03-24T00:00:00.000Z"),
      });

      await expect(
        authService.refreshSession({
          refresh_token: "stolen-token",
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Refresh token reuse detected",
      });

      expect(authSecurityModel.revokeRefreshTokenFamily).toHaveBeenCalledWith(
        "family-1",
        "reuse_detected"
      );
      expect(authSecurityModel.revokeRefreshTokensForUser).toHaveBeenCalledWith(
        9,
        "reuse_detected"
      );
    });

    test("forgotPassword is generic when email does not exist", async () => {
      const { authService, userModel, emailService } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue(null);

      const result = await authService.forgotPassword({
        email: "missing@example.com",
      });

      expect(result.message).toContain("If an account with that email exists");
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test("forgotPassword stores hashed reset token and sends email when user exists", async () => {
      const { authService, userModel, emailService, tokenSecurity } = loadAuthService();

      userModel.findUserByEmail.mockResolvedValue({
        id: 11,
        name: "Alice",
        email: "alice@example.com",
      });
      tokenSecurity.generateOpaqueToken.mockReturnValueOnce("reset-token");

      const result = await authService.forgotPassword({
        email: "alice@example.com",
      });

      expect(userModel.storePasswordResetToken).toHaveBeenCalledWith({
        user_id: 11,
        token_hash: "hash:reset-token",
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.message).toContain("If an account with that email exists");
    });

    test("resetPassword updates password and revokes sessions", async () => {
      const { authService, userModel, authSecurityModel, bcrypt } = loadAuthService();

      userModel.findUserByPasswordResetToken.mockResolvedValue({
        id: 4,
        password_reset_token_expiry: new Date("2026-03-24T00:15:00.000Z"),
      });
      bcrypt.hash.mockResolvedValue("new-hash");

      const result = await authService.resetPassword({
        token: "reset-token",
        new_password: "N3w!Password",
      });

      expect(userModel.updateUserPassword).toHaveBeenCalledWith({
        user_id: 4,
        password_hash: "new-hash",
      });
      expect(userModel.clearPasswordResetToken).toHaveBeenCalledWith(4);
      expect(authSecurityModel.revokeRefreshTokensForUser).toHaveBeenCalledWith(
        4,
        "password_reset"
      );
      expect(result.message).toBe("Password reset successfully");
    });

    test("resetPassword rejects invalid or expired tokens", async () => {
      const { authService, userModel, tokenSecurity } = loadAuthService();

      userModel.findUserByPasswordResetToken.mockResolvedValue({
        id: 4,
        password_reset_token_expiry: new Date("2026-03-24T00:15:00.000Z"),
      });
      tokenSecurity.isExpired.mockReturnValueOnce(true);

      await expect(
        authService.resetPassword({
          token: "reset-token",
          new_password: "N3w!Password",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid or expired reset token",
      });
    });

    test("verifyEmail marks user as verified", async () => {
      const { authService, userModel } = loadAuthService();

      userModel.findUserByVerificationToken.mockResolvedValue({
        id: 6,
        verification_token_expiry: new Date("2026-03-24T00:15:00.000Z"),
      });

      const result = await authService.verifyEmail({
        token: "verify-token",
      });

      expect(userModel.markEmailVerified).toHaveBeenCalledWith(6);
      expect(result.message).toBe("Email verified successfully");
    });

    test("verifyOtp exchanges a valid OTP challenge for a session", async () => {
      const { authService, authSecurityModel, userModel, tokenSecurity } = loadAuthService();

      authSecurityModel.findOtpChallengeByHash.mockResolvedValue({
        id: 2,
        user_id: 8,
        otp_hash: "hash:123456",
        attempts: 0,
        consumed_at: null,
        expires_at: new Date("2026-03-24T00:15:00.000Z"),
      });
      userModel.findUserById.mockResolvedValue({
        id: 8,
        name: "Buyer User",
        email: "buyer@example.com",
        role: "buyer",
        is_verified: true,
        mfa_enabled: true,
      });
      tokenSecurity.generateOpaqueToken
        .mockReturnValueOnce("refresh-token")
        .mockReturnValueOnce("family-id");

      const result = await authService.verifyOtp({
        challenge_token: "challenge-token",
        otp: "123456",
      });

      expect(authSecurityModel.consumeOtpChallenge).toHaveBeenCalledWith(2);
      expect(result.access_token).toBe("access-token");
      expect(result.refresh_token).toBe("refresh-token");
    });

    test("logoutUser revokes a single session or all devices", async () => {
      const { authService, authSecurityModel } = loadAuthService();

      authSecurityModel.findRefreshTokenByHash.mockResolvedValue({
        id: 5,
      });

      const singleSession = await authService.logoutUser({
        refresh_token: "refresh-token",
      });

      expect(authSecurityModel.revokeRefreshTokenById).toHaveBeenCalledWith(5, {
        revoked_reason: "logout",
      });
      expect(singleSession.logout_all).toBe(false);

      const allDevices = await authService.logoutUser({
        actor: { user_id: 9 },
        all_devices: true,
      });

      expect(authSecurityModel.revokeRefreshTokensForUser).toHaveBeenCalledWith(
        9,
        "logout_all"
      );
      expect(allDevices.logout_all).toBe(true);
    });
  });

  describe("auth routes", () => {
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
        req.user = {
          id: 9,
          user_id: 9,
          role: "buyer",
        };
        next();
      };

      app = buildAuthApp(authServiceMock, authMiddlewareMock);
    });

    test("POST /api/auth/login returns session data and refresh cookie", async () => {
      authServiceMock.loginUser.mockResolvedValue({
        access_token: "access-token",
        token: "access-token",
        token_type: "Bearer",
        expires_in_minutes: 15,
        refresh_token: "refresh-token",
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
      expect(response.body.access_token).toBe("access-token");
      expect(response.body.refresh_token).toBe("refresh-token");
      expect(response.headers["set-cookie"][0]).toContain("gh_refresh_token=");
    });

    test("POST /api/auth/login returns MFA challenge when required", async () => {
      authServiceMock.loginUser.mockResolvedValue({
        mfa_required: true,
        challenge_token: "challenge-token",
        challenge_expires_at: "2026-03-24T00:15:00.000Z",
        user: { id: 3, role: "buyer" },
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "buyer@example.com",
        password: "Str0ng!Pass",
      });

      expect(response.status).toBe(202);
      expect(response.body.mfa_required).toBe(true);
      expect(response.body.challenge_token).toBe("challenge-token");
    });

    test("POST /api/auth/refresh rotates the session", async () => {
      authServiceMock.refreshSession.mockResolvedValue({
        access_token: "new-access-token",
        token: "new-access-token",
        token_type: "Bearer",
        expires_in_minutes: 15,
        refresh_token: "new-refresh-token",
        user: { id: 3, role: "buyer" },
      });

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refresh_token: "old-refresh-token" });

      expect(response.status).toBe(200);
      expect(response.body.refresh_token).toBe("new-refresh-token");
      expect(response.headers["set-cookie"][0]).toContain("gh_refresh_token=");
    });

    test("POST /api/auth/logout clears the refresh cookie", async () => {
      authServiceMock.logoutUser.mockResolvedValue({
        logout_all: false,
      });

      const response = await request(app)
        .post("/api/auth/logout")
        .send({ refresh_token: "refresh-token" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out successfully");
      expect(response.headers["set-cookie"][0]).toContain("gh_refresh_token=");
    });

    test("POST /api/auth/forgot-password returns the generic security message", async () => {
      authServiceMock.forgotPassword.mockResolvedValue({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });

      const response = await request(app).post("/api/auth/forgot-password").send({
        email: "buyer@example.com",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("If an account with that email exists");
    });

    test("POST /api/auth/reset-password returns service response", async () => {
      authServiceMock.resetPassword.mockResolvedValue({
        message: "Password reset successfully",
      });

      const response = await request(app).post("/api/auth/reset-password").send({
        token: "reset-token",
        new_password: "N3w!Password",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Password reset successfully");
    });

    test("GET /api/auth/verify-email delegates to the service", async () => {
      authServiceMock.verifyEmail.mockResolvedValue({
        message: "Email verified successfully",
      });

      const response = await request(app).get("/api/auth/verify-email?token=verify-token");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email verified successfully");
    });

    test("POST /api/auth/verify-otp returns a session after MFA", async () => {
      authServiceMock.verifyOtp.mockResolvedValue({
        access_token: "access-token",
        token: "access-token",
        token_type: "Bearer",
        expires_in_minutes: 15,
        refresh_token: "refresh-token",
        user: { id: 3, role: "buyer" },
      });

      const response = await request(app).post("/api/auth/verify-otp").send({
        challenge_token: "challenge-token",
        otp: "123456",
      });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBe("access-token");
      expect(response.body.refresh_token).toBe("refresh-token");
    });

    test("protected profile route still works", async () => {
      authServiceMock.getUserProfile.mockResolvedValue({
        id: 9,
        email: "buyer@example.com",
        role: "buyer",
      });

      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(9);
    });

    test("auth routes map service errors correctly", async () => {
      authServiceMock.refreshSession.mockRejectedValue(
        Object.assign(new Error("Refresh token expired"), { statusCode: 401 })
      );

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refresh_token: "expired-token" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Refresh token expired");
    });
  });
});
