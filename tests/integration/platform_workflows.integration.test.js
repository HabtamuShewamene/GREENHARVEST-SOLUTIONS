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
const { createRouteApp } = require("../helpers/createRouteApp");
const describeIntegration = require("../helpers/integrationGate");

describeIntegration("Platform workflows integration", () => {
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

  const assignAgentToFarmer = async (farmerId = actors.farmer.id) => {
    const response = await request(app)
      .post("/api/agents/assign-farmer")
      .set(authHeader(tokens.adminToken))
      .send({
        agent_id: actors.agent.id,
        farmer_id: farmerId,
      });

    expect(response.status).toBe(201);
    return response;
  };

  const createProductAsAgent = async ({
    farmerId = actors.farmer.id,
    name = "Agent Tomato",
    price = 25,
    stock = 10,
  } = {}) => {
    const response = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.agentToken))
      .send({
        farmer_id: farmerId,
        name,
        price,
        stock,
        category_id: category.id,
      });

    return response;
  };

  const createProductAsFarmer = async ({
    name = "Farmer Tomato",
    price = 20,
    stock = 10,
  } = {}) => {
    const response = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.farmerToken))
      .send({
        name,
        price,
        stock,
        category_id: category.id,
      });

    return response;
  };

  const addItemToCart = async (productId, quantity) => {
    const response = await request(app)
      .post("/api/cart")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        quantity,
      });

    return response;
  };

  const createOrderAsBuyer = async () => {
    return request(app)
      .post("/api/orders")
      .set(authHeader(tokens.buyerToken))
      .send({});
  };

  const confirmOrderAsAgent = async (orderId) => {
    const response = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(tokens.agentToken))
      .send({
        status: "confirmed",
      });

    return response;
  };

  beforeAll(async () => {
    // Build the isolated runtime schema once for this suite.
    adminPool = await initializeIntegrationDatabase();

    jest.resetModules();
    app = require("../../src/app");
    appPool = require("../../src/config/db").pool;
  });

  beforeEach(async () => {
    // Reset all test data so every case starts from a clean database.
    await resetIntegrationDatabase(adminPool);

    category = await createCategory(adminPool, {
      name: "Vegetables",
      description: "Integration category",
    });

    // Create the core actors used across the agricultural marketplace flows.
    actors = {
      admin: await createUser(adminPool, {
        name: "Admin User",
        email: "admin-platform@test.local",
        password,
        role: "admin",
      }),
      buyer: await createUser(adminPool, {
        name: "Buyer User",
        email: "buyer-platform@test.local",
        password,
        role: "buyer",
      }),
      farmer: await createUser(adminPool, {
        name: "Farmer User",
        email: "farmer-platform@test.local",
        password,
        role: "farmer",
      }),
      agent: await createUser(adminPool, {
        name: "Field Agent",
        email: "agent-platform@test.local",
        password,
        role: "field_agent",
      }),
      delivery: await createUser(adminPool, {
        name: "Delivery Partner",
        email: "delivery-platform@test.local",
        password,
        role: "delivery_partner",
      }),
    };

    // Log in every actor so role-based API tests can use real JWTs.
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

  describe("Products + Orders", () => {
    test("field agent creates a farmer product, buyer orders it, inventory is decremented, and the cart is cleared", async () => {
      // Agent must first be assigned to the farmer they are acting for.
      await assignAgentToFarmer();

      const createProductResponse = await createProductAsAgent({
        name: "Agent Cabbage",
        price: 25,
        stock: 12,
      });

      expect(createProductResponse.status).toBe(201);

      const productId = createProductResponse.body.product.id;

      const productRow = await queryOne(
        adminPool,
        `
          SELECT product_id, farmer_id, category_id, name, price
          FROM products
          WHERE product_id = $1
        `,
        [productId]
      );
      const inventoryBeforeOrder = await queryOne(
        adminPool,
        `
          SELECT quantity
          FROM inventory
          WHERE product_id = $1
        `,
        [productId]
      );

      expect(productRow.name).toBe("Agent Cabbage");
      expect(Number(productRow.farmer_id)).toBe(Number(actors.farmer.id));
      expect(Number(productRow.category_id)).toBe(Number(category.id));
      expect(Number(productRow.price)).toBe(25);
      expect(inventoryBeforeOrder.quantity).toBe(12);

      const addToCartResponse = await addItemToCart(productId, 3);
      expect(addToCartResponse.status).toBe(200);
      expect(addToCartResponse.body.cart).toHaveLength(1);

      const orderResponse = await createOrderAsBuyer();
      expect(orderResponse.status).toBe(201);

      const orderId = orderResponse.body.order.id;

      const orderRow = await queryOne(
        adminPool,
        `
          SELECT order_id, buyer_id, farmer_id, field_agent_id, total_amount
          FROM orders
          WHERE order_id = $1
        `,
        [orderId]
      );
      const orderItems = await queryRows(
        adminPool,
        `
          SELECT product_id, quantity, price
          FROM order_items
          WHERE order_id = $1
          ORDER BY order_item_id ASC
        `,
        [orderId]
      );
      const inventoryAfterOrder = await queryOne(
        adminPool,
        `
          SELECT quantity
          FROM inventory
          WHERE product_id = $1
        `,
        [productId]
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

      expect(Number(orderRow.buyer_id)).toBe(Number(actors.buyer.id));
      expect(Number(orderRow.farmer_id)).toBe(Number(actors.farmer.id));
      expect(Number(orderRow.field_agent_id)).toBe(Number(actors.agent.id));
      expect(Number(orderRow.total_amount)).toBe(75);
      expect(orderItems).toHaveLength(1);
      expect(Number(orderItems[0].product_id)).toBe(Number(productId));
      expect(orderItems[0].quantity).toBe(3);
      expect(Number(orderItems[0].price)).toBe(25);
      expect(inventoryAfterOrder.quantity).toBe(9);
      expect(cartRows).toHaveLength(0);
    });

    test("unassigned agents and buyers are blocked from product creation, and mixed-farmer orders are rejected", async () => {
      const otherFarmer = await createUser(adminPool, {
        name: "Other Farmer",
        email: "other-farmer-platform@test.local",
        password,
        role: "farmer",
      });

      // Agent is not assigned yet, so this write should be forbidden.
      const unassignedAgentResponse = await createProductAsAgent({
        farmerId: otherFarmer.id,
        name: "Forbidden Pepper",
      });

      expect(unassignedAgentResponse.status).toBe(403);

      // Buyers must never be able to create products.
      const buyerCreateProductResponse = await request(app)
        .post("/api/products")
        .set(authHeader(tokens.buyerToken))
        .send({
          name: "Buyer Tomato",
          price: 10,
          stock: 5,
          category_id: category.id,
        });

      expect(buyerCreateProductResponse.status).toBe(403);

      // Build a valid mixed-cart scenario to verify transactional farmer validation on order creation.
      await assignAgentToFarmer(actors.farmer.id);
      await assignAgentToFarmer(otherFarmer.id);

      const firstProductResponse = await createProductAsAgent({
        farmerId: actors.farmer.id,
        name: "Farmer One Tomato",
        price: 10,
        stock: 5,
      });
      const secondProductResponse = await createProductAsAgent({
        farmerId: otherFarmer.id,
        name: "Farmer Two Tomato",
        price: 12,
        stock: 5,
      });

      expect(firstProductResponse.status).toBe(201);
      expect(secondProductResponse.status).toBe(201);

      await addItemToCart(firstProductResponse.body.product.id, 1);
      await addItemToCart(secondProductResponse.body.product.id, 1);

      const mixedOrderResponse = await createOrderAsBuyer();

      expect(mixedOrderResponse.status).toBe(400);
      expect(mixedOrderResponse.body.message).toBe(
        "All products in an order must belong to the same farmer"
      );

      const orderRows = await queryRows(adminPool, `SELECT order_id FROM orders`);
      expect(orderRows).toHaveLength(0);
    });
  });

  describe("Payments + Deliveries", () => {
    test("buyers pay valid orders, admin assigns delivery, and delivery completion updates order status", async () => {
      await assignAgentToFarmer();

      const productResponse = await createProductAsFarmer({
        name: "Payment Tomato",
        price: 30,
        stock: 8,
      });

      expect(productResponse.status).toBe(201);

      const productId = productResponse.body.product.id;

      const addToCartResponse = await addItemToCart(productId, 2);
      expect(addToCartResponse.status).toBe(200);

      const orderResponse = await createOrderAsBuyer();
      expect(orderResponse.status).toBe(201);

      const orderId = orderResponse.body.order.id;

      const paymentResponse = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: orderId,
          payment_method: "card",
          amount: 60,
        });

      expect(paymentResponse.status).toBe(201);
      expect(paymentResponse.body.payment).toBeTruthy();

      const paymentRow = await queryOne(
        adminPool,
        `
          SELECT payment_id, order_id, payment_status, payment_method, paid_at
          FROM payments
          WHERE order_id = $1
        `,
        [orderId]
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

      expect(Number(paymentRow.order_id)).toBe(Number(orderId));
      expect(paymentRow.payment_status).toBe("paid");
      expect(paymentRow.payment_method).toBe("card");
      expect(paymentRow.paid_at).toBeTruthy();
      expect(Number(transactionRow.amount)).toBe(60);

      const confirmOrderResponse = await confirmOrderAsAgent(orderId);
      expect(confirmOrderResponse.status).toBe(200);

      const assignDeliveryResponse = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.adminToken))
        .send({
          order_id: orderId,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(assignDeliveryResponse.status).toBe(201);

      const deliveryId = assignDeliveryResponse.body.delivery.id;

      const deliveredResponse = await request(app)
        .patch(`/api/delivery/${deliveryId}/status`)
        .set(authHeader(tokens.deliveryToken))
        .send({
          status: "delivered",
        });

      expect(deliveredResponse.status).toBe(200);

      const deliveryRow = await queryOne(
        adminPool,
        `
          SELECT delivery_status
          FROM deliveries
          WHERE delivery_id = $1
        `,
        [deliveryId]
      );
      const deliveredOrderRow = await queryOne(
        adminPool,
        `
          SELECT order_status
          FROM orders
          WHERE order_id = $1
        `,
        [orderId]
      );

      expect(deliveryRow.delivery_status).toBe("delivered");
      expect(deliveredOrderRow.order_status).toBe("delivered");
    });

    test("wrong payment amounts, unauthorized payment attempts, and unauthorized delivery actions are rejected", async () => {
      await assignAgentToFarmer();

      const productResponse = await createProductAsFarmer({
        name: "Unauthorized Payment Tomato",
        price: 20,
        stock: 5,
      });

      expect(productResponse.status).toBe(201);

      await addItemToCart(productResponse.body.product.id, 1);

      const orderResponse = await createOrderAsBuyer();
      expect(orderResponse.status).toBe(201);

      const orderId = orderResponse.body.order.id;

      const wrongAmountResponse = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: orderId,
          payment_method: "card",
          amount: 19,
        });

      expect(wrongAmountResponse.status).toBe(400);
      expect(wrongAmountResponse.body.message).toBe("Payment amount does not match order total");

      const unauthorizedPaymentResponse = await request(app)
        .post("/api/payments")
        .set(authHeader(tokens.farmerToken))
        .send({
          order_id: orderId,
          payment_method: "card",
          amount: 20,
        });

      expect(unauthorizedPaymentResponse.status).toBe(403);
      expect(unauthorizedPaymentResponse.body.message).toBe("You can only pay for your own orders");

      const confirmOrderResponse = await confirmOrderAsAgent(orderId);
      expect(confirmOrderResponse.status).toBe(200);

      const unauthorizedAssignResponse = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.buyerToken))
        .send({
          order_id: orderId,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(unauthorizedAssignResponse.status).toBe(403);

      const validAssignResponse = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.adminToken))
        .send({
          order_id: orderId,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Addis Ababa",
        });

      expect(validAssignResponse.status).toBe(201);

      const unauthorizedDeliveryUpdate = await request(app)
        .patch(`/api/delivery/${validAssignResponse.body.delivery.id}/status`)
        .set(authHeader(tokens.buyerToken))
        .send({
          status: "shipped",
        });

      expect(unauthorizedDeliveryUpdate.status).toBe(403);

      const paymentRows = await queryRows(
        adminPool,
        `SELECT payment_id FROM payments WHERE order_id = $1`,
        [orderId]
      );

      expect(paymentRows).toHaveLength(0);
    });
  });

  describe("Notifications + Reviews + Inventory", () => {
    test("inventory stays synchronized, admins can notify buyers, and buyers can mark notifications as read", async () => {
      const productResponse = await createProductAsFarmer({
        name: "Inventory Onion",
        price: 15,
        stock: 3,
      });

      expect(productResponse.status).toBe(201);

      const productId = productResponse.body.product.id;

      // Inventory upsert should reflect the latest source-of-truth quantity.
      const inventoryUpdateResponse = await request(app)
        .put("/api/inventory/update")
        .set(authHeader(tokens.farmerToken))
        .send({
          product_id: productId,
          quantity: 12,
        });

      expect(inventoryUpdateResponse.status).toBe(200);

      const inventoryRow = await queryOne(
        adminPool,
        `
          SELECT quantity
          FROM inventory
          WHERE product_id = $1
        `,
        [productId]
      );

      expect(inventoryRow.quantity).toBe(12);

      const createNotificationResponse = await request(app)
        .post("/api/notifications")
        .set(authHeader(tokens.adminToken))
        .send({
          user_id: actors.buyer.id,
          title: "Order update",
          message: "Your produce is being prepared",
          type: "order",
        });

      expect(createNotificationResponse.status).toBe(201);

      const notificationId = createNotificationResponse.body.notification.id;

      const notificationListResponse = await request(app)
        .get("/api/notifications")
        .set(authHeader(tokens.buyerToken));

      expect(notificationListResponse.status).toBe(200);
      expect(notificationListResponse.body.notifications).toHaveLength(1);
      expect(notificationListResponse.body.notifications[0].is_read).toBe(false);

      const markReadResponse = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set(authHeader(tokens.buyerToken));

      expect(markReadResponse.status).toBe(200);
      expect(markReadResponse.body.notification.is_read).toBe(true);

      const updatedNotificationRow = await queryOne(
        adminPool,
        `
          SELECT is_read
          FROM notifications
          WHERE notification_id = $1
        `,
        [notificationId]
      );

      expect(updatedNotificationRow.is_read).toBe(true);

      // Buyers are not allowed to create notifications for other users.
      const unauthorizedNotificationResponse = await request(app)
        .post("/api/notifications")
        .set(authHeader(tokens.buyerToken))
        .send({
          user_id: actors.farmer.id,
          title: "Unauthorized notification",
          message: "This should fail",
        });

      expect(unauthorizedNotificationResponse.status).toBe(403);

      // Buyers also cannot write directly to inventory.
      const unauthorizedInventoryResponse = await request(app)
        .put("/api/inventory/update")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: productId,
          quantity: 5,
        });

      expect(unauthorizedInventoryResponse.status).toBe(403);
    });

    test("buyers can review delivered products, invalid ratings fail, and duplicate reviews are blocked", async () => {
      await assignAgentToFarmer();

      const productResponse = await createProductAsFarmer({
        name: "Review Tomato",
        price: 18,
        stock: 6,
      });

      expect(productResponse.status).toBe(201);

      const productId = productResponse.body.product.id;

      await addItemToCart(productId, 1);
      const orderResponse = await createOrderAsBuyer();
      expect(orderResponse.status).toBe(201);

      const orderId = orderResponse.body.order.id;

      const confirmOrderResponse = await confirmOrderAsAgent(orderId);
      expect(confirmOrderResponse.status).toBe(200);

      const assignDeliveryResponse = await request(app)
        .post("/api/delivery/assign")
        .set(authHeader(tokens.adminToken))
        .send({
          order_id: orderId,
          delivery_partner_id: actors.delivery.id,
          delivery_location: "Adama",
        });

      expect(assignDeliveryResponse.status).toBe(201);

      const deliveredResponse = await request(app)
        .patch(`/api/delivery/${assignDeliveryResponse.body.delivery.id}/status`)
        .set(authHeader(tokens.deliveryToken))
        .send({
          status: "delivered",
        });

      expect(deliveredResponse.status).toBe(200);

      // A delivered-order buyer should be able to leave product feedback.
      const reviewResponse = await request(app)
        .post("/api/reviews")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: productId,
          rating: 5,
          comment: "Excellent quality",
        });

      expect(reviewResponse.status).toBe(201);

      const reviewRow = await queryOne(
        adminPool,
        `
          SELECT product_id, buyer_id, rating, comment
          FROM reviews
          WHERE review_id = $1
        `,
        [reviewResponse.body.review.id]
      );

      expect(Number(reviewRow.product_id)).toBe(Number(productId));
      expect(Number(reviewRow.buyer_id)).toBe(Number(actors.buyer.id));
      expect(reviewRow.rating).toBe(5);
      expect(reviewRow.comment).toBe("Excellent quality");

      // Validate API-side input checking for invalid rating values.
      const invalidRatingResponse = await request(app)
        .post("/api/reviews")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: productId,
          rating: 7,
          comment: "Invalid rating",
        });

      expect(invalidRatingResponse.status).toBe(400);
      expect(invalidRatingResponse.body.message).toBe(
        "rating must be an integer between 1 and 5"
      );

      // The same buyer should not be able to review the same product twice.
      const duplicateReviewResponse = await request(app)
        .post("/api/reviews")
        .set(authHeader(tokens.buyerToken))
        .send({
          product_id: productId,
          rating: 4,
          comment: "Second review",
        });

      expect(duplicateReviewResponse.status).toBe(409);
      expect(duplicateReviewResponse.body.message).toBe(
        "You have already reviewed this product"
      );
    });

    test.todo("emit notifications automatically for order, payment, delivery, and review events");
    test.todo("restrict reviews to products that were actually purchased and delivered");
    test.todo("restore inventory automatically when a return workflow is implemented");
  });

  describe("Health check", () => {
    test("GET /api/health reports backend readiness and live PostgreSQL time", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.backend).toBe("running");
      expect(response.body.database).toBe("connected");
      expect(response.body.dbTime).toBeTruthy();
      expect(Number.isNaN(Date.parse(response.body.dbTime))).toBe(false);
    });
  });
});

describe("Platform workflows integration health failure path", () => {
  let app;

  beforeAll(() => {
    jest.resetModules();

    // Mock the pool only for the readiness failure case so the rest of the file stays live-db.
    jest.doMock("../../src/config/db", () => ({
      pool: {
        query: jest.fn().mockRejectedValue(new Error("database unavailable")),
      },
    }));

    const healthRoutes = require("../../src/routes/healthRoutes");
    app = createRouteApp("/api", healthRoutes);
  });

  afterAll(() => {
    jest.resetModules();
    jest.dontMock("../../src/config/db");
  });

  test("GET /api/health returns 503 when PostgreSQL is unavailable", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("fail");
    expect(response.body.backend).toBe("running");
    expect(response.body.database).toBe("disconnected");
    expect(response.body.error).toBe("database unavailable");
  });
});
