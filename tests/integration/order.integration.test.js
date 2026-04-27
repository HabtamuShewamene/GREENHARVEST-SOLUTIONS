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
const describeIntegration = require("../helpers/integrationGate");

describeIntegration("Product to order integration flow", () => {
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

  const assignAgentToFarmer = async (agentId = actors.agent.id, farmerId = actors.farmer.id) => {
    const response = await request(app)
      .post("/api/agents/assign-farmer")
      .set(authHeader(tokens.adminToken))
      .send({
        agent_id: agentId,
        farmer_id: farmerId,
      });

    expect(response.status).toBe(201);
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
      name: "Order Flow Category",
      description: "Integration test category",
    });

    actors = {
      admin: await createUser(adminPool, {
        name: "Admin User",
        email: "admin-order@test.local",
        password,
        role: "admin",
      }),
      farmer: await createUser(adminPool, {
        name: "Farmer One",
        email: "farmer-order@test.local",
        password,
        role: "farmer",
      }),
      agent: await createUser(adminPool, {
        name: "Agent One",
        email: "agent-order@test.local",
        password,
        role: "field_agent",
      }),
      buyer: await createUser(adminPool, {
        name: "Buyer One",
        email: "buyer-order@test.local",
        password,
        role: "buyer",
      }),
    };

    tokens = {
      adminToken: await loginAndCaptureSession(actors.admin.email, password),
      farmerToken: await loginAndCaptureSession(actors.farmer.email, password),
      agentToken: await loginAndCaptureSession(actors.agent.email, password),
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

  test("agent creates a product for an assigned farmer", async () => {
    await assignAgentToFarmer();

    const response = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.agentToken))
      .send({
        name: "Tomato",
        price: 50,
        category_id: category.id,
        farmer_id: actors.farmer.id,
        stock: 20,
      });

    expect(response.status).toBe(201);
    expect(response.body.product).toBeTruthy();

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
        SELECT quantity
        FROM inventory
        WHERE product_id = $1
      `,
      [response.body.product.id]
    );

    expect(productRow.name).toBe("Tomato");
    expect(Number(productRow.price)).toBe(50);
    expect(Number(productRow.farmer_id)).toBe(Number(actors.farmer.id));
    expect(Number(productRow.category_id)).toBe(Number(category.id));
    expect(inventoryRow.quantity).toBe(20);
  });

  test("agent cannot create a product for an unassigned farmer", async () => {
    const otherFarmer = await createUser(adminPool, {
      name: "Farmer Two",
      email: "farmer-two-order@test.local",
      password,
      role: "farmer",
    });

    const response = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.agentToken))
      .send({
        name: "Onion",
        price: 40,
        category_id: category.id,
        farmer_id: otherFarmer.id,
        stock: 10,
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Field agent is not assigned to this farmer");

    const productRows = await queryRows(
      adminPool,
      `SELECT product_id FROM products WHERE name = $1`,
      ["Onion"]
    );

    expect(productRows).toHaveLength(0);
  });

  test("inventory is updated, buyer adds to cart, creates order, inventory is reduced, and cart is cleared", async () => {
    await assignAgentToFarmer();

    const productResponse = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.agentToken))
      .send({
        name: "Order Tomato",
        price: 25,
        category_id: category.id,
        farmer_id: actors.farmer.id,
        stock: 20,
      });

    expect(productResponse.status).toBe(201);

    const productId = productResponse.body.product.id;

    const inventoryUpdateResponse = await request(app)
      .put("/api/inventory/update")
      .set(authHeader(tokens.agentToken))
      .send({
        product_id: productId,
        quantity: 100,
      });

    expect(inventoryUpdateResponse.status).toBe(200);

    const inventoryAfterUpdate = await queryOne(
      adminPool,
      `
        SELECT quantity
        FROM inventory
        WHERE product_id = $1
      `,
      [productId]
    );

    expect(inventoryAfterUpdate.quantity).toBe(100);

    const addToCartResponse = await request(app)
      .post("/api/cart")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        quantity: 5,
      });

    expect(addToCartResponse.status).toBe(200);
    expect(addToCartResponse.body.cart).toHaveLength(1);

    const cartBeforeOrder = await queryRows(
      adminPool,
      `
        SELECT ci.cart_item_id, ci.quantity
        FROM cart_items ci
        JOIN carts c ON c.cart_id = ci.cart_id
        WHERE c.buyer_id = $1
      `,
      [actors.buyer.id]
    );

    expect(cartBeforeOrder).toHaveLength(1);
    expect(cartBeforeOrder[0].quantity).toBe(5);

    const orderResponse = await request(app)
      .post("/api/orders")
      .set(authHeader(tokens.buyerToken))
      .send({});

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.order).toBeTruthy();

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
    const cartAfterOrder = await queryRows(
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
    expect(Number(orderRow.total_amount)).toBe(125);
    expect(orderItems).toHaveLength(1);
    expect(Number(orderItems[0].product_id)).toBe(Number(productId));
    expect(orderItems[0].quantity).toBe(5);
    expect(Number(orderItems[0].price)).toBe(25);
    expect(inventoryAfterOrder.quantity).toBe(95);
    expect(cartAfterOrder).toHaveLength(0);
  });
});
