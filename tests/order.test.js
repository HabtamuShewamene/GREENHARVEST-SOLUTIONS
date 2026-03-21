const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadOrderService = () => {
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

  jest.doMock("../src/models/orderModel", () => ({
    createOrderItemRecord: jest.fn(),
    createOrderRecord: jest.fn(),
    decrementProductStock: jest.fn(),
    findOrderById: jest.fn(),
    findProductSupplyChainById: jest.fn(),
    getOrdersForBuyer: jest.fn(),
    updateOrderStatusById: jest.fn(),
  }));

  const orderService = require("../src/services/orderService");
  const orderModel = require("../src/models/orderModel");

  return { orderService, orderModel, client };
};

const buildOrderApp = ({ orderServiceMock, deliveryServiceMock }) => {
  jest.resetModules();
  jest.doMock("../src/services/orderService", () => orderServiceMock);
  jest.doMock("../src/services/deliveryService", () => deliveryServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const orderRoutes = require("../src/routes/orderRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/orders", orderRoutes);
};

describe("Order tests", () => {
  describe("orderService create order", () => {
    test("creates order and auto assigns farmer_id and field_agent_id", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              {
                id: 1,
                product_id: 10,
                quantity: 2,
                name: "Tomato",
                price: 11,
                stock: 10,
                cart_id: 99,
              },
            ],
          };
        }

        return { rows: [] };
      });

      orderModel.findProductSupplyChainById.mockResolvedValue({
        product_id: 10,
        farmer_id: 50,
        field_agent_id: 7,
      });
      orderModel.createOrderRecord.mockResolvedValue({ id: 15 });
      orderModel.createOrderItemRecord.mockResolvedValue({ id: 22 });
      orderModel.decrementProductStock.mockResolvedValue({ id: 10, stock: 8 });
      orderModel.getOrdersForBuyer.mockResolvedValue([{ id: 15, farmer_id: 50, field_agent_id: 7 }]);

      const order = await orderService.createOrder(3, {});

      expect(orderModel.createOrderRecord).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          buyer_id: 3,
          farmer_id: 50,
          field_agent_id: 7,
        })
      );
      expect(order.id).toBe(15);
    });

    test("rejects invalid product during order creation", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              {
                product_id: 999,
                quantity: 1,
                name: "Ghost Product",
                price: 5,
                stock: 5,
              },
            ],
          };
        }

        return { rows: [] };
      });

      orderModel.findProductSupplyChainById.mockResolvedValue(null);

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    test("rejects empty cart", async () => {
      const { orderService, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return { rows: [] };
        }

        return { rows: [] };
      });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Cart is empty",
      });
    });

    test("rejects invalid address id", async () => {
      const { orderService } = loadOrderService();

      await expect(
        orderService.createOrder(3, { address_id: "bad" })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "address_id must be a valid integer",
      });
    });
  });

  describe("orderService workflow", () => {
    test("field_agent can move pending to confirmed", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValue({
        id: 11,
        order_status: "pending",
        field_agent_id: 7,
        delivery_partner_id: 20,
      });
      orderModel.updateOrderStatusById.mockResolvedValue({
        id: 11,
        order_status: "confirmed",
      });

      const order = await orderService.updateOrderStatus({
        actor: { id: 7, role: "field_agent" },
        order_id: 11,
        status: "confirmed",
      });

      expect(orderModel.updateOrderStatusById).toHaveBeenCalledWith(11, "confirmed");
      expect(order.order_status).toBe("confirmed");
    });

    test("rejects invalid order transition", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValue({
        id: 11,
        order_status: "pending",
        field_agent_id: 7,
        delivery_partner_id: 20,
      });

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "field_agent" },
          order_id: 11,
          status: "collected",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid order status transition from pending to collected",
      });
    });

    test("delivery_partner can move collected to in_transit and in_transit to delivered", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById
        .mockResolvedValueOnce({
          id: 12,
          order_status: "collected",
          field_agent_id: 7,
          delivery_partner_id: 21,
        })
        .mockResolvedValueOnce({
          id: 12,
          order_status: "in_transit",
          field_agent_id: 7,
          delivery_partner_id: 21,
        });

      orderModel.updateOrderStatusById
        .mockResolvedValueOnce({ id: 12, order_status: "in_transit" })
        .mockResolvedValueOnce({ id: 12, order_status: "delivered" });

      const transitOrder = await orderService.updateOrderStatus({
        actor: { id: 21, role: "delivery_partner" },
        order_id: 12,
        status: "in_transit",
      });

      const deliveredOrder = await orderService.updateOrderStatus({
        actor: { id: 21, role: "delivery_partner" },
        order_id: 12,
        status: "delivered",
      });

      expect(transitOrder.order_status).toBe("in_transit");
      expect(deliveredOrder.order_status).toBe("delivered");
    });

    test("rejects role-based status violation", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValue({
        id: 13,
        order_status: "pending",
        field_agent_id: 7,
        delivery_partner_id: 21,
      });

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 21, role: "delivery_partner" },
          order_id: 13,
          status: "confirmed",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    test("rejects missing status", async () => {
      const { orderService } = loadOrderService();

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "field_agent" },
          order_id: 13,
          status: "",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "status is required",
      });
    });

    test("rejects unauthenticated status update", async () => {
      const { orderService } = loadOrderService();

      await expect(
        orderService.updateOrderStatus({
          actor: null,
          order_id: 13,
          status: "confirmed",
        })
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    test("rejects non-existing order on status update", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "field_agent" },
          order_id: 999,
          status: "confirmed",
        })
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("order routes", () => {
    let orderServiceMock;
    let deliveryServiceMock;
    let app;

    beforeEach(() => {
      orderServiceMock = {
        createOrder: jest.fn(),
        getOrdersForBuyer: jest.fn(),
        getOrderByIdForBuyer: jest.fn(),
        updateOrderStatus: jest.fn(),
      };

      deliveryServiceMock = {
        assignDeliveryPartnerToOrder: jest.fn(),
      };

      app = buildOrderApp({ orderServiceMock, deliveryServiceMock });
    });

    test("creates order", async () => {
      orderServiceMock.createOrder.mockResolvedValue({
        id: 1,
        farmer_id: 50,
        field_agent_id: 7,
      });

      const response = await request(app)
        .post("/api/orders")
        .set("x-test-role", "buyer")
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.order.field_agent_id).toBe(7);
    });

    test("fetches orders", async () => {
      orderServiceMock.getOrdersForBuyer.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const response = await request(app)
        .get("/api/orders")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(2);
    });

    test("updates order status through the workflow endpoint", async () => {
      orderServiceMock.updateOrderStatus.mockResolvedValue({
        id: 8,
        order_status: "confirmed",
      });

      const response = await request(app)
        .patch("/api/orders/8/status")
        .set("x-test-role", "field_agent")
        .send({ status: "confirmed" });

      expect(response.status).toBe(200);
      expect(response.body.order.order_status).toBe("confirmed");
    });

    test("rejects unauthorized workflow role at route level", async () => {
      const response = await request(app)
        .patch("/api/orders/8/status")
        .set("x-test-role", "buyer")
        .send({ status: "confirmed" });

      expect(response.status).toBe(403);
    });

    test("returns order not found from controller", async () => {
      orderServiceMock.updateOrderStatus.mockRejectedValue(
        Object.assign(new Error("Order not found"), { statusCode: 404 })
      );

      const response = await request(app)
        .patch("/api/orders/404/status")
        .set("x-test-role", "field_agent")
        .send({ status: "confirmed" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Order not found");
    });
  });
});
