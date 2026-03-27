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

describeIntegration("Reviews integration flow", () => {
  const password = "Str0ng!Pass1!";

  let app;
  let appPool;
  let adminPool;
  let actors;
  let tokens;
  let category;
  let productId;

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

    category = await createCategory(adminPool, {
      name: "Review Category",
      description: "Integration category",
    });

    actors = {
      buyer: await createUser(adminPool, {
        name: "Buyer Review",
        email: "buyerreview@test.local",
        password,
        role: "buyer",
      }),
      farmer: await createUser(adminPool, {
        name: "Farmer Review",
        email: "farmerreview@test.local",
        password,
        role: "farmer",
      }),
      admin: await createUser(adminPool, {
        name: "Admin Review",
        email: "adminreview@test.local",
        password,
        role: "admin",
      }),
    };

    tokens = {
      buyerToken: await loginAndCaptureSession(actors.buyer.email, password),
      farmerToken: await loginAndCaptureSession(actors.farmer.email, password),
      adminToken: await loginAndCaptureSession(actors.admin.email, password),
    };

    const productResponse = await request(app)
      .post("/api/products")
      .set(authHeader(tokens.farmerToken))
      .send({
        name: "Tomato",
        price: 15,
        stock: 20,
        category_id: category.id,
      });

    expect(productResponse.status).toBe(201);
    productId = productResponse.body.product.id;
  });

  afterAll(async () => {
    if (appPool) {
      await appPool.end();
    }

    if (adminPool) {
      await closeIntegrationDatabase(adminPool);
    }
  });

  test("buyer can submit a valid review", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        rating: 5,
        comment: "Excellent!",
      });

    expect(response.status).toBe(201);
    expect(response.body.review.rating).toBe(5);

    const reviewRow = await queryOne(
      adminPool,
      `
        SELECT review_id, product_id, buyer_id, rating, comment
        FROM reviews
        WHERE review_id = $1
      `,
      [response.body.review.id]
    );

    expect(Number(reviewRow.product_id)).toBe(Number(productId));
    expect(Number(reviewRow.buyer_id)).toBe(Number(actors.buyer.id));
    expect(reviewRow.rating).toBe(5);
    expect(reviewRow.comment).toBe("Excellent!");
  });

  test("buyer cannot submit a duplicate review for the same product", async () => {
    const firstResponse = await request(app)
      .post("/api/reviews")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        rating: 5,
        comment: "First review",
      });

    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await request(app)
      .post("/api/reviews")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        rating: 4,
        comment: "Second review",
      });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.message).toBe("You have already reviewed this product");

    const reviewRows = await queryRows(
      adminPool,
      `
        SELECT review_id
        FROM reviews
        WHERE product_id = $1 AND buyer_id = $2
      `,
      [productId, actors.buyer.id]
    );

    expect(reviewRows).toHaveLength(1);
  });

  test("unauthorized users cannot submit a review", async () => {
    const response = await request(app).post("/api/reviews").send({
      product_id: productId,
      rating: 4,
      comment: "Test",
    });

    expect(response.status).toBe(401);
  });

  test("invalid rating is rejected", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set(authHeader(tokens.buyerToken))
      .send({
        product_id: productId,
        rating: 10,
        comment: "Too high rating",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("rating must be an integer between 1 and 5");
  });

  test.todo("restrict reviews to buyers who actually purchased the product");
});
