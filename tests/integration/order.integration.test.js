const request = require('supertest');
const app = require('../../src/app');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.TEST_DB_URL,
});

describe('🛒 Product → Order Integration Flow', () => {
  let agentToken, buyerToken;
  let farmerId, productId;

  beforeAll(async () => {
    // Clean DB
    await pool.query(`
      TRUNCATE users, farmer_profiles, buyer_profiles, field_agent_profiles,
      products, inventory, carts, cart_items, orders, order_items
      RESTART IDENTITY CASCADE;
    `);

    // 1️⃣ Register Farmer
    const farmerRes = await request(app).post('/api/auth/register').send({
      name: 'Farmer One',
      email: 'farmer@test.com',
      password: '123456',
      role: 'farmer',
    });

    farmerId = farmerRes.body.user.id;

    // 2️⃣ Register Field Agent
    await request(app).post('/api/auth/register').send({
      name: 'Agent One',
      email: 'agent@test.com',
      password: '123456',
      role: 'field_agent',
    });

    const agentLogin = await request(app).post('/api/auth/login').send({
      email: 'agent@test.com',
      password: '123456',
    });

    agentToken = agentLogin.body.token;

    // 3️⃣ Register Buyer
    await request(app).post('/api/auth/register').send({
      name: 'Buyer One',
      email: 'buyer@test.com',
      password: '123456',
      role: 'buyer',
    });

    const buyerLogin = await request(app).post('/api/auth/login').send({
      email: 'buyer@test.com',
      password: '123456',
    });

    buyerToken = buyerLogin.body.token;

    // 4️⃣ Assign Agent → Farmer
    await pool.query(`
      INSERT INTO agent_farmers (agent_id, farmer_id)
      VALUES (2, 1)
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  // ---------------- PRODUCT ----------------

  test('✅ Agent creates product for farmer', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        name: 'Tomato',
        price: 50,
        category_id: 1,
        farmer_id: farmerId,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('product');

    productId = res.body.product.id;
  });

  test('❌ Agent creates product for unassigned farmer (fail)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        name: 'Onion',
        price: 40,
        category_id: 1,
        farmer_id: 999,
      });

    expect(res.statusCode).toBe(403);
  });

  // ---------------- INVENTORY ----------------

  test('✅ Set product inventory', async () => {
    const res = await request(app)
      .post(`/api/inventory/${productId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ quantity: 100 });

    expect(res.statusCode).toBe(200);
  });

  // ---------------- CART ----------------

  test('✅ Buyer adds product to cart', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        product_id: productId,
        quantity: 5,
      });

    expect(res.statusCode).toBe(200);
  });

  // ---------------- ORDER ----------------

  test('✅ Buyer creates order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('order');
  });

  // ---------------- DB VALIDATION ----------------

  test('✅ Inventory reduced after order', async () => {
    const result = await pool.query(
      'SELECT quantity FROM inventory WHERE product_id = $1',
      [productId]
    );

    expect(result.rows[0].quantity).toBe(95);
  });

  test('✅ Cart cleared after order', async () => {
    const result = await pool.query('SELECT * FROM cart_items');

    expect(result.rows.length).toBe(0);
  });
});