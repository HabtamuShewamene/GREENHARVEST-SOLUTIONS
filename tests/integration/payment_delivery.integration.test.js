const request = require("supertest");

const {
  closeIntegrationDatabase,
  createCategory,
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

describeIntegration("Payment and delivery integration flow", () => {
  const password = "Str0ng!Pass1!";

  let app;
  let appPool;
  let adminPool;
  let actors;
  let tokens;
  let category;

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

  const assignAgentToFarmer = async () => {
    const response = await request(app)
      .post("/api/agents/assign-farmer")
      .set(authHeader(tokens.adminToken))
      .send({
        agent_id: actors.agent.id,
        farmer_id: actors.farmer.id,
      });

    expect(response.status).toBe(201);
  };

  const createOrderForBuyer = async ({ price = 20, stock = 10, quantity = 2 } = {}) => {
    await assignAgentToFarmer();

    const productResponse = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.farmerToken))
      .send({
        name: `Payment Product ${Date.now()}`,
        price,
        stock,
        category_id: category.id,
      });

    expect(productResponse.status).toBe(201);

    const productId = productResponse.body.product.id;

    const addToCartResponse = await request(app)
      .post("/api/cart")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        quantity,
      });

    expect(addToCartResponse.status).toBe(200);

    const orderResponse = await request(app)
      .post("/api/orders")
      .set(authHeader(tokens.buyerToken))
      .send({});

    expect(orderResponse.status).toBe(201);

    return {
      order: orderResponse.body.order,
      productId,
      totalAmount: price * quantity,
    };
  };

  const confirmOrderAsAgent = async (orderId) => {
    const response = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(tokens.agentToken))
      .send({
        status: "confirmed",
      });

    expect(response.status).toBe(200);
  };

  beforeAll(async () => {
    adminPool = await initializeIntegrationDatabase();

    jest.resetModules();
    app = require("../../src/app");
    appPool = require("../../src/config/db").pool;
  });

  beforeEach(async () => {
    await resetIntegrationDatabase(adminPool);

    category = await createCategory(adminPool, {
      name: "Vegetables",
      description: "Integration category",
    });

    actors = {
      admin: await createUser(adminPool, {
        name: "Admin User",
        email: "admin-payment@test.local",
        password,
        role: "admin",
      }),
      buyer: await createUser(adminPool, {
        name: "Buyer User",
        email: "buyer-payment@test.local",
        password,
        role: "buyer",
      }),
      farmer: await createUser(adminPool, {
        name: "Farmer User",
        email: "farmer-payment@test.local",
        password,
        role: "farmer",
      }),
      agent: await createUser(adminPool, {
        name: "Agent User",
        email: "agent-payment@test.local",
        password,
        role: "field_agent",
      }),
      delivery: await createUser(adminPool, {
        name: "Delivery User",
        email: "delivery-payment@test.local",
        password,
        role: "delivery_partner",
      }),
    };

    tokens = {
      adminToken: await loginAndCaptureSession(actors.admin.email, password),
      buyerToken: await loginAndCaptureSession(actors.buyer.email, password),
      farmerToken: await loginAndCaptureSession(actors.farmer.email, password),
      agentToken: await loginAndCaptureSession(actors.agent.email, password),
      deliveryToken: await loginAndCaptureSession(actors.delivery.email, password),
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

  describe("Payment flow", () => {
    test("buyer pays the correct amount and payment records are marked as paid", async () => {
      const { order, totalAmount } = await createOrderForBuyer({
        price: 20,
        quantity: 10,
        stock: 20,
      });

      const response = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: order.id,
          payment_method: "card",
          amount: totalAmount,
        });

      expect(response.status).toBe(201);
      expect(response.body.payment).toBeTruthy();

      const paymentRow = await queryOne(
        adminPool,
        `
          SELECT payment_id, order_id, payment_status, payment_method, paid_at
          FROM payments
          WHERE order_id = $1
        `,
        [order.id]
      );
      const transactionRow = await queryOne(
        adminPool,
        `
          SELECT payment_id, amount
          FROM transactions
          WHERE payment_id = $1
        `,
        [paymentRow.payment_id]
      );

      expect(Number(paymentRow.order_id)).toBe(Number(order.id));
      expect(paymentRow.payment_status).toBe("paid");
      expect(paymentRow.payment_method).toBe("card");
      expect(paymentRow.paid_at).toBeTruthy();
      expect(Number(transactionRow.payment_id)).toBe(Number(paymentRow.payment_id));
      expect(Number(transactionRow.amount)).toBe(totalAmount);
    });

    test("buyer cannot pay the wrong amount", async () => {
      const { order } = await createOrderForBuyer({
        price: 20,
        quantity: 10,
        stock: 20,
      });

      const response = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: order.id,
          payment_method: "card",
          amount: 50,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Payment amount does not match order total");

      const paymentRows = await queryRows(
        adminPool,
        `SELECT payment_id FROM payments WHERE order_id = $1`,
        [order.id]
      );

      expect(paymentRows).toHaveLength(0);
    });

    test("non-buyer order owners cannot be impersonated for payment", async () => {
      const { order, totalAmount } = await createOrderForBuyer({
        price: 20,
        quantity: 10,
        stock: 20,
      });

      const response = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.deliveryToken))
        .send({
          order_id: order.id,
          payment_method: "card",
          amount: totalAmount,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("You can only pay for your own orders");
    });
  });

  describe("Delivery flow", () => {
    test("admin assigns a delivery partner to an order", async () => {
      const { order } = await createOrderForBuyer({
        price: 20,
        quantity: 2,
        stock: 10,
      });

      await confirmOrderAsAgent(order.id);

      const response = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.adminToken))
        .send({
          order_id: order.id,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(response.status).toBe(201);
      expect(response.body.delivery).toBeTruthy();

      const deliveryRow = await queryOne(
        adminPool,
        `
          SELECT delivery_id, order_id, delivery_partner_id, delivery_status
          FROM deliveries
          WHERE order_id = $1
        `,
        [order.id]
      );

      expect(Number(deliveryRow.order_id)).toBe(Number(order.id));
      expect(Number(deliveryRow.delivery_partner_id)).toBe(Number(actors.delivery.id));
      expect(deliveryRow.delivery_status).toBe("assigned");
    });

    test("delivery partner updates the delivery status", async () => {
      const { order } = await createOrderForBuyer({
        price: 20,
        quantity: 2,
        stock: 10,
      });

      await confirmOrderAsAgent(order.id);

      const assignResponse = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.adminToken))
        .send({
          order_id: order.id,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(assignResponse.status).toBe(201);

      const deliveryId = assignResponse.body.delivery.id;

      const statusResponse = await request(app)
        .patch(`/api/delivery/${deliveryId}/status`)
        .set(authHeader(tokens.deliveryToken))
        .send({
          status: "shipped",
        });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.delivery.status).toBe("shipped");

      const deliveryRow = await queryOne(
        adminPool,
        `
          SELECT delivery_status
          FROM deliveries
          WHERE delivery_id = $1
        `,
        [deliveryId]
      );

      expect(deliveryRow.delivery_status).toBe("shipped");
    });

    test("non-admin users cannot assign delivery partners", async () => {
      const { order } = await createOrderForBuyer({
        price: 20,
        quantity: 2,
        stock: 10,
      });

      await confirmOrderAsAgent(order.id);

      const response = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: order.id,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "Forbidden: insufficient permissions. Required role: admin"
      );

      const deliveryRows = await queryRows(
        adminPool,
        `SELECT delivery_id FROM deliveries WHERE order_id = $1`,
        [order.id]
      );

      expect(deliveryRows).toHaveLength(0);
    });
  });
});
