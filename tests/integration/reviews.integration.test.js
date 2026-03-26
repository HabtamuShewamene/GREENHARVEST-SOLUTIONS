// tests/integration/reviews.integration.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.TEST_DB_URL });

describe('⭐ Reviews Integration Flow', () => {
  let buyerToken, productId, orderId;

  beforeAll(async () => {
    await pool.query(`
      TRUNCATE users, buyer_profiles, orders, products, reviews, inventory
      RESTART IDENTITY CASCADE;
    `);

    // Seed buyer
    await request(app).post('/api/auth/register').send({
      name: 'Buyer Review',
      email: 'buyerreview@test.com',
      password: '123456',
      role: 'buyer',
    });

    const login = await request(app).post('/api/auth/login').send({
      email: 'buyerreview@test.com',
      password: '123456',
    });
    buyerToken = login.body.token;

    // Seed product
    await pool.query(`INSERT INTO categories (name) VALUES ('Vegetables')`);
    const prodRes = await pool.query(`
      INSERT INTO products (name, price, category_id, farmer_id)
      VALUES ('Tomato', 15, 1, 1) RETURNING id
    `);
    productId = prodRes.rows[0].id;

    // Buyer purchases product
    await pool.query(`INSERT INTO orders (buyer_id, status) VALUES (1, 'paid') RETURNING id`);
    orderId = 1; // simplified
  });

  afterAll(async () => {
    await pool.end();
  });

  test('✅ Buyer can submit a valid review', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ product_id: productId, rating: 5, comment: 'Excellent!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.review).toHaveProperty('rating', 5);
  });

  test('❌ Buyer cannot submit review for unpurchased product', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ product_id: 999, rating: 5, comment: 'Fake purchase' });

    expect(res.statusCode).toBe(403);
  });

  test('❌ Unauthorized user cannot submit review', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ product_id: productId, rating: 4, comment: 'Test' });

    expect(res.statusCode).toBe(401);
  });

  test('❌ Invalid rating', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ product_id: productId, rating: 10, comment: 'Too high rating' });

    expect(res.statusCode).toBe(400);
  });
});