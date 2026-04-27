const request = require("supertest");

const {
  closeIntegrationDatabase,
  createUser,
  initializeIntegrationDatabase,
  queryOne,
  queryRows,
  resetIntegrationDatabase,
} = require("../helpers/integrationDb");
const describeIntegration = require("../helpers/integrationGate");

describeIntegration("Notifications integration flow", () => {
  const password = "Str0ng!Pass1!";

  let app;
  let appPool;
  let adminPool;
  let actors;
  let tokens;

  const authHeader = (token) => ({
    Authorization: `Bearer ${token}`,
  });

  const loginAndCaptureSession = async (email, userPassword) => {
    const response = await request(app).post("/api/auth/login").send({
      email,
      password: userPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.access_token).toBeTruthy();

    return response.body.access_token;
  };

  beforeAll(async () => {
    adminPool = await initializeIntegrationDatabase();

    jest.resetModules();
    app = require("../../src/app");
    appPool = require("../../src/config/db").pool;
  });

  beforeEach(async () => {
    await resetIntegrationDatabase(adminPool);

    actors = {
      admin: await createUser(adminPool, {
        name: "Admin User",
        email: "admin-notification@test.local",
        password,
        role: "admin",
      }),
      buyer: await createUser(adminPool, {
        name: "Buyer User",
        email: "buyer-notification@test.local",
        password,
        role: "buyer",
      }),
    };

    tokens = {
      adminToken: await loginAndCaptureSession(actors.admin.email, password),
      buyerToken: await loginAndCaptureSession(actors.buyer.email, password),
    };
  });

  afterAll(async () => {
    if (appPool) {
      await appPool.end();
    }

    if (adminPool) {
      await closeIntegrationDatabase(adminPool);
    }
  });

  test("admin creates a notification and the buyer can retrieve it", async () => {
    const createResponse = await request(app)
      .post("/api/notifications")
      .set(authHeader(tokens.adminToken))
      .send({
        user_id: actors.buyer.id,
        title: "Order update",
        message: "Your order was received",
        type: "order",
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.notification).toBeTruthy();

    const notificationRow = await queryOne(
      adminPool,
      `
        SELECT notification_id, user_id, title, message, is_read
        FROM notifications
        WHERE notification_id = $1
      `,
      [createResponse.body.notification.id]
    );

    expect(Number(notificationRow.user_id)).toBe(Number(actors.buyer.id));
    expect(notificationRow.title).toBe("Order update");
    expect(notificationRow.message).toBe("Your order was received");
    expect(notificationRow.is_read).toBe(false);

    const listResponse = await request(app)
      .get("/api/notifications")
      .set(authHeader(tokens.buyerToken));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.notifications).toHaveLength(1);
    expect(listResponse.body.notifications[0].id).toBe(notificationRow.notification_id.toString());
    expect(listResponse.body.notifications[0].is_read).toBe(false);
  });

  test("buyer marks a notification as read", async () => {
    const createResponse = await request(app)
      .post("/api/notifications")
      .set(authHeader(tokens.adminToken))
      .send({
        user_id: actors.buyer.id,
        title: "Payment update",
        message: "Your payment has been recorded",
        type: "payment",
      });

    expect(createResponse.status).toBe(201);

    const notificationId = createResponse.body.notification.id;

    const markReadResponse = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set(authHeader(tokens.buyerToken));

    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body.notification.is_read).toBe(true);

    const notificationRow = await queryOne(
      adminPool,
      `
        SELECT is_read
        FROM notifications
        WHERE notification_id = $1
      `,
      [notificationId]
    );

    expect(notificationRow.is_read).toBe(true);
  });

  test("unauthorized users cannot view notifications", async () => {
    const response = await request(app).get("/api/notifications");

    expect(response.status).toBe(401);
  });

  test("non-admin users cannot create notifications", async () => {
    const response = await request(app)
      .post("/api/notifications")
      .set(authHeader(tokens.buyerToken))
      .send({
        user_id: actors.buyer.id,
        title: "Unauthorized notification",
        message: "This should not be created",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Only admins can create notifications");

    const notificationRows = await queryRows(
      adminPool,
      `SELECT notification_id FROM notifications`
    );

    expect(notificationRows).toHaveLength(0);
  });

  test.todo("emit a notification automatically when an order is created");
});
