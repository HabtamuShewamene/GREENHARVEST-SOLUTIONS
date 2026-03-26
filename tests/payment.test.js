const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadPaymentService = () => {
  jest.resetModules();

  const client = {
    query: jest.fn(),
    release: jest.fn(),
  };

  jest.doMock("../src/config/db", () => ({
    pool: {
      connect: jest.fn(async () => client),
    },
  }));

  jest.doMock("../src/models/paymentModel", () => ({
    createPayment: jest.fn(),
    createTransaction: jest.fn(),
    findOrderByIdForUpdate: jest.fn(),
    getPaymentHistoryByBuyer: jest.fn(),
    getTransactionHistoryByUser: jest.fn(),
    updateOrderPaymentStatus: jest.fn(),
  }));

  jest.doMock("../src/utils/logger", () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }));

  const paymentService = require("../src/services/paymentService");
  const paymentModel = require("../src/models/paymentModel");

  return { client, paymentModel, paymentService };
};

const buildPaymentApp = (paymentServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/paymentService", () => paymentServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const paymentRoutes = require("../src/routes/paymentRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/payments", paymentRoutes);
};

describe("Payment API", () => {
  describe("paymentService", () => {
    test("processes a valid payment successfully", async () => {
      const { client, paymentModel, paymentService } = loadPaymentService();

      client.query.mockResolvedValue({ rows: [] });
      paymentModel.findOrderByIdForUpdate.mockResolvedValue({
        id: 9,
        buyer_id: 4,
        total_amount: "19.50",
        payment_status: "pending",
      });
      paymentModel.createPayment.mockImplementation(async (dbClient, payload) => ({
        id: 33,
        ...payload,
      }));
      paymentModel.createTransaction.mockResolvedValue({ id: 77 });
      paymentModel.updateOrderPaymentStatus.mockResolvedValue(undefined);

      const payment = await paymentService.processPayment({
        user_id: 4,
        order_id: 9,
        payment_method: "  card  ",
        amount: "19.50",
      });

      expect(client.query).toHaveBeenCalledWith("BEGIN");
      expect(paymentModel.createPayment).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          order_id: 9,
          payment_method: "card",
          amount: "19.50",
          payment_status: "paid",
          transaction_id: expect.stringMatching(/^txn_/),
        })
      );
      expect(paymentModel.createTransaction).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          payment_id: 33,
          amount: "19.50",
        })
      );
      expect(paymentModel.updateOrderPaymentStatus).toHaveBeenCalledWith(client, {
        order_id: 9,
        payment_status: "paid",
      });
      expect(client.query).toHaveBeenCalledWith("COMMIT");
      expect(payment.payment_status).toBe("paid");
    });

    test("rejects invalid ids, SQL injection-like input, and invalid amounts", async () => {
      const { paymentService } = loadPaymentService();

      await expect(
        paymentService.processPayment({
          user_id: 4,
          order_id: "9 OR 1=1",
          payment_method: "card",
          amount: 10,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "order_id, payment_method, and a valid amount are required",
      });

      await expect(
        paymentService.processPayment({
          user_id: 4,
          order_id: 9,
          payment_method: "",
          amount: 0,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "order_id, payment_method, and a valid amount are required",
      });
    });

    test("rejects payment with the wrong amount", async () => {
      const { client, paymentModel, paymentService } = loadPaymentService();

      client.query.mockResolvedValue({ rows: [] });
      paymentModel.findOrderByIdForUpdate.mockResolvedValue({
        id: 9,
        buyer_id: 4,
        total_amount: "19.50",
        payment_status: "pending",
      });

      await expect(
        paymentService.processPayment({
          user_id: 4,
          order_id: 9,
          payment_method: "card",
          amount: 18,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Payment amount does not match order total",
      });

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("rejects payment for another user's order", async () => {
      const { client, paymentModel, paymentService } = loadPaymentService();

      client.query.mockResolvedValue({ rows: [] });
      paymentModel.findOrderByIdForUpdate.mockResolvedValue({
        id: 9,
        buyer_id: 99,
        total_amount: "19.50",
        payment_status: "pending",
      });

      await expect(
        paymentService.processPayment({
          user_id: 4,
          order_id: 9,
          payment_method: "card",
          amount: 19.5,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You can only pay for your own orders",
      });
    });

    test("rejects already paid orders and returns payment history", async () => {
      const { client, paymentModel, paymentService } = loadPaymentService();

      client.query.mockResolvedValue({ rows: [] });
      paymentModel.findOrderByIdForUpdate.mockResolvedValue({
        id: 9,
        buyer_id: 4,
        total_amount: "19.50",
        payment_status: "paid",
      });

      await expect(
        paymentService.processPayment({
          user_id: 4,
          order_id: 9,
          payment_method: "card",
          amount: 19.5,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Order has already been paid",
      });

      paymentModel.getPaymentHistoryByBuyer.mockResolvedValue([{ id: 1 }]);
      paymentModel.getTransactionHistoryByUser.mockResolvedValue([{ id: 2 }]);

      const history = await paymentService.getPaymentHistory(4);

      expect(history.payments).toHaveLength(1);
      expect(history.transactions).toHaveLength(1);
    });
  });

  describe("payment routes", () => {
    let app;
    let paymentServiceMock;

    beforeEach(() => {
      paymentServiceMock = {
        getPaymentHistory: jest.fn(),
        processPayment: jest.fn(),
      };

      app = buildPaymentApp(paymentServiceMock);
    });

    test("processes payment through the API", async () => {
      paymentServiceMock.processPayment.mockResolvedValue({
        id: 10,
        order_id: 9,
        payment_status: "paid",
      });

      const response = await request(app)
        .post("/api/payments/process")
        .set("x-test-role", "buyer")
        .send({ order_id: 9, payment_method: "card", amount: 19.5 });

      expect(response.status).toBe(201);
      expect(response.body.payment.payment_status).toBe("paid");
      expect(paymentServiceMock.processPayment).toHaveBeenCalledWith({
        user_id: 1,
        order_id: 9,
        payment_method: "card",
        amount: 19.5,
      });
    });

    test("payment endpoints require authentication", async () => {
      const response = await request(app)
        .post("/api/payments/process")
        .send({ order_id: 9, payment_method: "card", amount: 19.5 });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication is required");
    });

    test("maps wrong-amount errors from the payment service", async () => {
      paymentServiceMock.processPayment.mockRejectedValue(
        Object.assign(new Error("Payment amount does not match order total"), {
          statusCode: 400,
        })
      );

      const response = await request(app)
        .post("/api/payments")
        .set("x-test-role", "buyer")
        .send({ order_id: 9, payment_method: "card", amount: 18 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Payment amount does not match order total");
    });

    test("returns payment history for the authenticated user", async () => {
      paymentServiceMock.getPaymentHistory.mockResolvedValue({
        payments: [{ id: 1 }],
        transactions: [{ id: 2 }],
      });

      const response = await request(app)
        .get("/api/payments/history")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(200);
      expect(response.body.payments).toHaveLength(1);
      expect(response.body.transactions).toHaveLength(1);
    });
  });
});
