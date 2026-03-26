const request = require("supertest");

const {
  closeIntegrationDatabase,
  createCategory,
  createUser,
  initializeIntegrationDatabase,
  queryOne,
  queryRows,
  resetIntegrationDatabase,
} = require("./helpers/integrationDb");

const hasRealTestDb =
  Boolean(process.env.TEST_DB_URL) &&
  !/your_database_password/i.test(process.env.TEST_DB_URL) &&
  !/example/i.test(process.env.TEST_DB_URL);
const describeIntegration = hasRealTestDb ? describe : describe.skip;

describeIntegration("Full integration suite (real PostgreSQL)", () => {
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
    expect(response.body.refresh_token).toBeTruthy();

    return {
      accessToken: response.body.access_token,
      refreshToken: response.body.refresh_token,
      response,
    };
  };

  const assignAgentToFarmer = async (agentId = actors.agent.id, farmerId = actors.farmer.id) => {
    const response = await request(app)
      .post("/api/agents/assign-farmer")
      .set(authHeader(tokens.adminToken))
      .send({
        agent_id: agentId,
        farmer_id: farmerId,
      });

    expect(response.status).toBe(201);
    return response;
  };

  const createProductAsFarmer = async (overrides = {}) => {
    const response = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.farmerToken))
      .send({
        name: "Roma Tomato",
        price: 12.5,
        stock: 8,
        category_id: category.id,
        description: "Field fresh",
        ...overrides,
      });

    expect(response.status).toBe(201);
    return response.body.product;
  };

  const createProductAsAgent = async (overrides = {}) => {
    const response = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.agentToken))
      .send({
        farmer_id: actors.farmer.id,
        name: "Agent Tomato",
        price: 11.25,
        stock: 6,
        category_id: category.id,
        ...overrides,
      });

    expect(response.status).toBe(201);
    return response.body.product;
  };

  const addItemToCart = async (productId, quantity) => {
    const response = await request(app)
      .post("/api/cart")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        quantity,
      });

    expect(response.status).toBe(200);
    return response.body.cart;
  };

  const createOrder = async (payload = {}) => {
    const response = await request(app)
      .post("/api/orders")
      .set(authHeader(tokens.buyerToken))
      .send(payload);

    expect(response.status).toBe(201);
    return response.body.order;
  };

  beforeAll(async () => {
    adminPool = await initializeIntegrationDatabase();

    jest.resetModules();
    app = require("../src/app");
    appPool = require("../src/config/db").pool;
  });

  beforeEach(async () => {
    await resetIntegrationDatabase(adminPool);

    category = await createCategory(adminPool, {
      name: "Vegetables",
      description: "Fresh produce",
    });

    actors = {
      admin: await createUser(adminPool, {
        name: "Admin User",
        email: "admin@test.local",
        password,
        role: "admin",
      }),
      buyer: await createUser(adminPool, {
        name: "Buyer User",
        email: "buyer@test.local",
        password,
        role: "buyer",
      }),
      farmer: await createUser(adminPool, {
        name: "Farmer User",
        email: "farmer@test.local",
        password,
        role: "farmer",
      }),
      agent: await createUser(adminPool, {
        name: "Field Agent",
        email: "agent@test.local",
        password,
        role: "field_agent",
      }),
      delivery: await createUser(adminPool, {
        name: "Delivery Partner",
        email: "delivery@test.local",
        password,
        role: "delivery_partner",
      }),
    };

    const adminSession = await loginAndCaptureSession(actors.admin.email, password);
    const buyerSession = await loginAndCaptureSession(actors.buyer.email, password);
    const farmerSession = await loginAndCaptureSession(actors.farmer.email, password);
    const agentSession = await loginAndCaptureSession(actors.agent.email, password);
    const deliverySession = await loginAndCaptureSession(actors.delivery.email, password);

    tokens = {
      adminRefreshToken: adminSession.refreshToken,
      adminToken: adminSession.accessToken,
      agentRefreshToken: agentSession.refreshToken,
      agentToken: agentSession.accessToken,
      buyerRefreshToken: buyerSession.refreshToken,
      buyerToken: buyerSession.accessToken,
      deliveryRefreshToken: deliverySession.refreshToken,
      deliveryToken: deliverySession.accessToken,
      farmerRefreshToken: farmerSession.refreshToken,
      farmerToken: farmerSession.accessToken,
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

  describe("Auth flow", () => {
    test("registers, logs in, refreshes the session, and accesses a protected route", async () => {
      const registerResponse = await request(app).post("/api/auth/register").send({
        name: "Fresh Buyer",
        email: "freshbuyer@test.local",
        password,
        role: "buyer",
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe("freshbuyer@test.local");

      const registeredUser = await queryOne(
        adminPool,
        `
          SELECT user_id, is_verified, verification_token_hash
          FROM users
          WHERE email = $1
        `,
        ["freshbuyer@test.local"]
      );

      expect(registeredUser).toBeTruthy();
      expect(registeredUser.is_verified).toBe(false);
      expect(registeredUser.verification_token_hash).toBeTruthy();

      await adminPool.query(
        `UPDATE users SET is_verified = TRUE WHERE user_id = $1`,
        [registeredUser.user_id]
      );

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "freshbuyer@test.local",
        password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.access_token).toBeTruthy();
      expect(loginResponse.body.refresh_token).toBeTruthy();

      const refreshTokenRow = await queryOne(
        adminPool,
        `
          SELECT user_id, token_hash, family_id, revoked_at
          FROM refresh_tokens
          WHERE user_id = $1
          ORDER BY id DESC
          LIMIT 1
        `,
        [registeredUser.user_id]
      );

      expect(refreshTokenRow).toBeTruthy();
      expect(refreshTokenRow.revoked_at).toBeNull();

      const profileResponse = await request(app)
        .get("/api/auth/me")
        .set(authHeader(loginResponse.body.access_token));

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe("freshbuyer@test.local");

      const refreshResponse = await request(app).post("/api/auth/refresh").send({
        refresh_token: loginResponse.body.refresh_token,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.access_token).toBeTruthy();
      expect(refreshResponse.body.refresh_token).not.toBe(loginResponse.body.refresh_token);

      const rotatedTokens = await queryRows(
        adminPool,
        `
          SELECT revoked_at, replaced_by_token_hash
          FROM refresh_tokens
          WHERE user_id = $1
          ORDER BY id ASC
        `,
        [registeredUser.user_id]
      );

      expect(rotatedTokens).toHaveLength(2);
      expect(rotatedTokens[0].revoked_at).toBeTruthy();
      expect(rotatedTokens[0].replaced_by_token_hash).toBeTruthy();
      expect(rotatedTokens[1].revoked_at).toBeNull();
    });

    test("rejects invalid login and protected access without a token", async () => {
      const invalidLoginResponse = await request(app).post("/api/auth/login").send({
        email: actors.buyer.email,
        password: "WrongPass1!",
      });

      expect(invalidLoginResponse.status).toBe(401);
      expect(invalidLoginResponse.body.message).toBe("Invalid credentials");

      const missingTokenResponse = await request(app).get("/api/auth/me");
      expect(missingTokenResponse.status).toBe(401);

      const invalidTokenResponse = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer not-a-real-token");

      expect(invalidTokenResponse.status).toBe(401);
      expect(invalidTokenResponse.body.message).toBe("Invalid token");
    });
  });

  describe("Product flow", () => {
    test("agent creates a product for an assigned farmer and the database reflects it", async () => {
      await assignAgentToFarmer();

      const response = await request(app)
        .post("/api/products")
        .set(authHeader(tokens.agentToken))
        .send({
          farmer_id: actors.farmer.id,
          category_id: category.id,
          name: "Agent Cabbage",
          price: 9.75,
          stock: 14,
        });

      expect(response.status).toBe(201);

      const productRow = await queryOne(
        adminPool,
        `
          SELECT product_id, farmer_id, category_id, name, price
          FROM products
          WHERE product_id = $1
        `,
        [response.body.product.id]
      );
      const inventoryRow = await queryOne(
        adminPool,
        `
          SELECT product_id, quantity
          FROM inventory
          WHERE product_id = $1
        `,
        [response.body.product.id]
      );

      expect(productRow.farmer_id).toBe(String(actors.farmer.id));
      expect(productRow.category_id).toBe(String(category.id));
      expect(productRow.name).toBe("Agent Cabbage");
      expect(Number(productRow.price)).toBe(9.75);
      expect(inventoryRow.quantity).toBe(14);
    });

    test("agent cannot create a product for an unassigned farmer", async () => {
      const otherFarmer = await createUser(adminPool, {
        name: "Other Farmer",
        email: "otherfarmer@test.local",
        password,
        role: "farmer",
      });

      const response = await request(app)
        .post("/api/products")
        .set(authHeader(tokens.agentToken))
        .send({
          farmer_id: otherFarmer.id,
          category_id: category.id,
          name: "Forbidden Pepper",
          price: 7.25,
          stock: 4,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Field agent is not assigned to this farmer");

      const productRows = await queryRows(
        adminPool,
        `SELECT product_id FROM products WHERE name = $1`,
        ["Forbidden Pepper"]
      );
      expect(productRows).toHaveLength(0);
    });

    test("farmer and assigned agent can update a product while unauthorized users are blocked", async () => {
      await assignAgentToFarmer();
      const product = await createProductAsFarmer({
        name: "Editable Tomato",
        stock: 5,
      });

      const farmerUpdateResponse = await request(app)
        .put(`/api/products/${product.id}`)
        .set(authHeader(tokens.farmerToken))
        .send({
          name: "Editable Tomato Prime",
          price: 14.5,
        });

      expect(farmerUpdateResponse.status).toBe(200);

      const agentUpdateResponse = await request(app)
        .put(`/api/products/${product.id}`)
        .set(authHeader(tokens.agentToken))
        .send({
          stock: 9,
        });

      expect(agentUpdateResponse.status).toBe(200);

      const unauthorizedResponse = await request(app)
        .put(`/api/products/${product.id}`)
        .set(authHeader(tokens.buyerToken))
        .send({
          price: 99,
        });

      expect(unauthorizedResponse.status).toBe(403);

      const productRow = await queryOne(
        adminPool,
        `
          SELECT p.name, p.price, i.quantity
          FROM products p
          JOIN inventory i ON i.product_id = p.product_id
          WHERE p.product_id = $1
        `,
        [product.id]
      );

      expect(productRow.name).toBe("Editable Tomato Prime");
      expect(Number(productRow.price)).toBe(14.5);
      expect(productRow.quantity).toBe(9);
    });
  });

  describe("Inventory flow", () => {
    test("adds and updates stock, and rejects negative quantities", async () => {
      const product = await createProductAsFarmer({
        name: "Inventory Onion",
        stock: 3,
      });

      const firstUpdateResponse = await request(app)
        .put("/api/inventory/update")
        .set(authHeader(tokens.farmerToken))
        .send({
          product_id: product.id,
          quantity: 12,
        });

      expect(firstUpdateResponse.status).toBe(200);

      const secondUpdateResponse = await request(app)
        .put("/api/inventory/update")
        .set(authHeader(tokens.farmerToken))
        .send({
          product_id: product.id,
          quantity: 7,
        });

      expect(secondUpdateResponse.status).toBe(200);

      const invalidResponse = await request(app)
        .put("/api/inventory/update")
        .set(authHeader(tokens.farmerToken))
        .send({
          product_id: product.id,
          quantity: -3,
        });

      expect(invalidResponse.status).toBe(400);

      const inventoryRow = await queryOne(
        adminPool,
        `
          SELECT quantity
          FROM inventory
          WHERE product_id = $1
        `,
        [product.id]
      );

      expect(inventoryRow.quantity).toBe(7);
    });
  });

  describe("Cart flow", () => {
    test("buyer adds, updates, and removes cart items with DB validation", async () => {
      const product = await createProductAsFarmer({
        name: "Cart Tomato",
        stock: 10,
      });

      const addResponse = await request(app)
        .post("/api/cart")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: product.id,
          quantity: 2,
        });

      expect(addResponse.status).toBe(200);
      expect(addResponse.body.cart).toHaveLength(1);

      const cartItemId = addResponse.body.cart[0].id;

      const cartRow = await queryOne(
        adminPool,
        `
          SELECT ci.quantity, ci.cart_item_id
          FROM cart_items ci
          JOIN carts c ON c.cart_id = ci.cart_id
          WHERE c.buyer_id = $1 AND ci.product_id = $2
        `,
        [actors.buyer.id, product.id]
      );

      expect(cartRow.quantity).toBe(2);
      expect(Number(cartRow.cart_item_id)).toBe(cartItemId);

      const invalidAddResponse = await request(app)
        .post("/api/cart")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: product.id,
          quantity: 99,
        });

      expect(invalidAddResponse.status).toBe(400);

      const updateResponse = await request(app)
        .patch(`/api/cart/${cartItemId}`)
        .set(authHeader(tokens.buyerToken))
        .send({
          quantity: 5,
        });

      expect(updateResponse.status).toBe(200);

      const updatedRow = await queryOne(
        adminPool,
        `
          SELECT quantity
          FROM cart_items
          WHERE cart_item_id = $1
        `,
        [cartItemId]
      );

      expect(updatedRow.quantity).toBe(5);

      const deleteResponse = await request(app)
        .delete(`/api/cart/${cartItemId}`)
        .set(authHeader(tokens.buyerToken));

      expect(deleteResponse.status).toBe(200);

      const deletedRow = await queryOne(
        adminPool,
        `
          SELECT cart_item_id
          FROM cart_items
          WHERE cart_item_id = $1
        `,
        [cartItemId]
      );

      expect(deletedRow).toBeNull();
    });

    test.todo("restrict cart usage to buyer role once route-level authorization is implemented");
  });

  describe("Order flow", () => {
    test("creates an order, creates order items, reduces inventory, and clears the cart", async () => {
      await assignAgentToFarmer();
      const product = await createProductAsFarmer({
        name: "Order Tomato",
        stock: 9,
        price: 13,
      });

      await addItemToCart(product.id, 3);

      const order = await createOrder();

      const orderRow = await queryOne(
        adminPool,
        `
          SELECT order_id, buyer_id, farmer_id, field_agent_id, total_amount
          FROM orders
          WHERE order_id = $1
        `,
        [order.id]
      );
      const orderItems = await queryRows(
        adminPool,
        `
          SELECT product_id, quantity, price
          FROM order_items
          WHERE order_id = $1
          ORDER BY order_item_id ASC
        `,
        [order.id]
      );
      const inventoryRow = await queryOne(
        adminPool,
        `
          SELECT quantity
          FROM inventory
          WHERE product_id = $1
        `,
        [product.id]
      );
      const cartRows = await queryRows(
        adminPool,
        `
          SELECT ci.cart_item_id
          FROM cart_items ci
          JOIN carts c ON c.cart_id = ci.cart_id
          WHERE c.buyer_id = $1
        `,
        [actors.buyer.id]
      );

      expect(orderRow.buyer_id).toBe(String(actors.buyer.id));
      expect(orderRow.farmer_id).toBe(String(actors.farmer.id));
      expect(orderRow.field_agent_id).toBe(String(actors.agent.id));
      expect(Number(orderRow.total_amount)).toBe(39);
      expect(orderItems).toHaveLength(1);
      expect(orderItems[0].quantity).toBe(3);
      expect(inventoryRow.quantity).toBe(6);
      expect(cartRows).toHaveLength(0);
    });

    test("rejects orders containing products from different farmers", async () => {
      await assignAgentToFarmer();
      const firstProduct = await createProductAsFarmer({
        name: "Farmer One Tomato",
        stock: 8,
      });

      const secondFarmer = await createUser(adminPool, {
        name: "Second Farmer",
        email: "secondfarmer@test.local",
        password,
        role: "farmer",
      });
      await request(app)
        .post("/api/agents/assign-farmer")
        .set(authHeader(tokens.adminToken))
        .send({
          agent_id: actors.agent.id,
          farmer_id: secondFarmer.id,
        });

      const secondProductResponse = await request(app)
        .post("/api/products")
        .set(authHeader(tokens.agentToken))
        .send({
          farmer_id: secondFarmer.id,
          category_id: category.id,
          name: "Farmer Two Tomato",
          price: 10,
          stock: 5,
        });

      expect(secondProductResponse.status).toBe(201);

      await addItemToCart(firstProduct.id, 1);
      await addItemToCart(secondProductResponse.body.product.id, 1);

      const response = await request(app)
        .post("/api/orders")
        .set(authHeader(tokens.buyerToken))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "All products in an order must belong to the same farmer"
      );

      const orderRows = await queryRows(adminPool, `SELECT order_id FROM orders`);
      expect(orderRows).toHaveLength(0);
    });

    test.todo(
      "enforce same field agent rule once product supply-chain resolution supports divergent agents within the same farmer scope"
    );
  });

  describe("Payment flow", () => {
    test("processes a valid payment and persists payment + transaction rows", async () => {
      await assignAgentToFarmer();
      const product = await createProductAsFarmer({
        name: "Payment Tomato",
        stock: 7,
        price: 15,
      });

      await addItemToCart(product.id, 2);
      const order = await createOrder();

      const response = await request(app)
        .post("/api/payments/process")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: order.id,
          payment_method: "card",
          amount: 30,
        });

      expect(response.status).toBe(201);

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

      expect(paymentRow.payment_status).toBe("paid");
      expect(paymentRow.payment_method).toBe("card");
      expect(paymentRow.paid_at).toBeTruthy();
      expect(Number(transactionRow.amount)).toBe(30);
    });

    test("rejects incorrect amounts and unauthorized payment attempts", async () => {
      await assignAgentToFarmer();
      const product = await createProductAsFarmer({
        name: "Unauthorized Payment Tomato",
        stock: 5,
        price: 20,
      });

      await addItemToCart(product.id, 1);
      const order = await createOrder();

      const wrongAmountResponse = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: order.id,
          payment_method: "card",
          amount: 19,
        });

      expect(wrongAmountResponse.status).toBe(400);
      expect(wrongAmountResponse.body.message).toBe("Payment amount does not match order total");

      const unauthorizedResponse = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.farmerToken))
        .send({
          order_id: order.id,
          payment_method: "card",
          amount: 20,
        });

      expect(unauthorizedResponse.status).toBe(403);
      expect(unauthorizedResponse.body.message).toBe("You can only pay for your own orders");

      const paymentRows = await queryRows(
        adminPool,
        `SELECT payment_id FROM payments WHERE order_id = $1`,
        [order.id]
      );

      expect(paymentRows).toHaveLength(0);
    });
  });

  describe("Delivery flow", () => {
    test("admin assigns a delivery partner and the partner updates delivery status", async () => {
      await assignAgentToFarmer();
      const product = await createProductAsFarmer({
        name: "Delivery Tomato",
        stock: 6,
      });

      await addItemToCart(product.id, 1);
      const order = await createOrder();

      const confirmOrderResponse = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(tokens.agentToken))
        .send({
          status: "confirmed",
        });

      expect(confirmOrderResponse.status).toBe(200);

      const assignResponse = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.adminToken))
        .send({
          order_id: order.id,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(assignResponse.status).toBe(201);

      const deliveryRow = await queryOne(
        adminPool,
        `
          SELECT delivery_id, order_id, delivery_partner_id, delivery_status
          FROM deliveries
          WHERE order_id = $1
        `,
        [order.id]
      );

      expect(deliveryRow.delivery_partner_id).toBe(String(actors.delivery.id));
      expect(deliveryRow.delivery_status).toBe("assigned");

      const statusResponse = await request(app)
        .patch(`/api/delivery/${deliveryRow.delivery_id}/status`)
        .set(authHeader(tokens.deliveryToken))
        .send({
          status: "shipped",
        });

      expect(statusResponse.status).toBe(200);

      const updatedDeliveryRow = await queryOne(
        adminPool,
        `
          SELECT delivery_status
          FROM deliveries
          WHERE delivery_id = $1
        `,
        [deliveryRow.delivery_id]
      );

      expect(updatedDeliveryRow.delivery_status).toBe("shipped");
    });

    test("rejects unauthorized delivery status updates", async () => {
      await assignAgentToFarmer();
      const product = await createProductAsFarmer({
        name: "Unauthorized Delivery Tomato",
        stock: 6,
      });

      await addItemToCart(product.id, 1);
      const order = await createOrder();

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

      const unauthorizedResponse = await request(app)
        .patch(`/api/delivery/${deliveryId}/status`)
        .set(authHeader(tokens.buyerToken))
        .send({
          status: "shipped",
        });

      expect(unauthorizedResponse.status).toBe(403);

      const deliveryRow = await queryOne(
        adminPool,
        `
          SELECT delivery_status
          FROM deliveries
          WHERE delivery_id = $1
        `,
        [deliveryId]
      );

      expect(deliveryRow.delivery_status).toBe("assigned");
    });
  });

  describe("Review flow", () => {
    test("buyer creates a review and the review persists in PostgreSQL", async () => {
      const product = await createProductAsFarmer({
        name: "Review Tomato",
      });

      const response = await request(app)
        .post("/api/reviews")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: product.id,
          rating: 5,
          comment: "Excellent quality",
        });

      expect(response.status).toBe(201);

      const reviewRow = await queryOne(
        adminPool,
        `
          SELECT product_id, buyer_id, rating, comment
          FROM reviews
          WHERE review_id = $1
        `,
        [response.body.review.id]
      );

      expect(reviewRow.product_id).toBe(String(product.id));
      expect(reviewRow.buyer_id).toBe(String(actors.buyer.id));
      expect(reviewRow.rating).toBe(5);
      expect(reviewRow.comment).toBe("Excellent quality");
    });

    test.todo("restrict review creation to buyers once role-based review authorization is implemented");
  });

  describe("Notification flow", () => {
    test("admin creates a notification and the user can mark it as read", async () => {
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

      const notificationRow = await queryOne(
        adminPool,
        `
          SELECT notification_id, user_id, title, message, is_read
          FROM notifications
          WHERE notification_id = $1
        `,
        [createResponse.body.notification.id]
      );

      expect(notificationRow.user_id).toBe(String(actors.buyer.id));
      expect(notificationRow.is_read).toBe(false);

      const markReadResponse = await request(app)
        .patch(`/api/notifications/${notificationRow.notification_id}/read`)
        .set(authHeader(tokens.buyerToken));

      expect(markReadResponse.status).toBe(200);

      const updatedNotificationRow = await queryOne(
        adminPool,
        `
          SELECT is_read
          FROM notifications
          WHERE notification_id = $1
        `,
        [notificationRow.notification_id]
      );

      expect(updatedNotificationRow.is_read).toBe(true);
    });

    test.todo("emit a notification automatically when an order is created");
    test.todo("emit a notification automatically when a payment succeeds");
  });

  describe("Security and validation", () => {
    test("rejects SQL injection-style payloads with safe validation errors", async () => {
      const response = await request(app)
        .put("/api/inventory/update")
        .set(authHeader(tokens.farmerToken))
        .send({
          product_id: "1 OR 1=1",
          quantity: 2,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("product_id and non-negative integer quantity are required");
    });
  });
});
