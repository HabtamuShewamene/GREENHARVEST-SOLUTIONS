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

    test("rejects insufficient stock in cart items", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              {
                id: 1,
                product_id: 10,
                quantity: 20,
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

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Insufficient stock for product: Tomato",
      });
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

    test("rejects missing farmer or missing field agent in supply chain", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              {
                product_id: 10,
                quantity: 1,
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

      orderModel.findProductSupplyChainById.mockResolvedValueOnce({
        product_id: 10,
        farmer_id: null,
        field_agent_id: 7,
      });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Farmer not found for product: 10",
      });

      orderModel.findProductSupplyChainById.mockResolvedValueOnce({
        product_id: 10,
        farmer_id: 50,
        field_agent_id: null,
      });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Field agent not assigned for farmer: 50",
      });
    });

    test("rejects cart items from different farmers or field agents", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              {
                id: 1,
                product_id: 10,
                quantity: 1,
                name: "Tomato",
                price: 11,
                stock: 10,
                cart_id: 99,
              },
              {
                id: 2,
                product_id: 11,
                quantity: 1,
                name: "Potato",
                price: 10,
                stock: 10,
                cart_id: 99,
              },
            ],
          };
        }

        return { rows: [] };
      });

      orderModel.findProductSupplyChainById
        .mockResolvedValueOnce({ product_id: 10, farmer_id: 50, field_agent_id: 7 })
        .mockResolvedValueOnce({ product_id: 11, farmer_id: 51, field_agent_id: 7 });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "All products in an order must belong to the same farmer",
      });

      orderModel.findProductSupplyChainById
        .mockResolvedValueOnce({ product_id: 10, farmer_id: 50, field_agent_id: 7 })
        .mockResolvedValueOnce({ product_id: 11, farmer_id: 50, field_agent_id: 8 });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "All products in an order must belong to the same field agent",
      });
    });

    test("rejects when decrementing stock would go negative", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
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
      orderModel.decrementProductStock.mockResolvedValue(null);

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Insufficient stock for product: Tomato",
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

    test("rejects invalid order status values", async () => {
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
          status: "teleported",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid order status value",
      });
    });

    test("rejects updates by unassigned field agents and delivery partners", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValueOnce({
        id: 11,
        order_status: "pending",
        field_agent_id: 7,
        delivery_partner_id: 20,
      });

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 8, role: "field_agent" },
          order_id: 11,
          status: "confirmed",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You are not assigned to this order as field agent",
      });

      orderModel.findOrderById.mockResolvedValueOnce({
        id: 12,
        order_status: "collected",
        field_agent_id: 7,
        delivery_partner_id: 21,
      });

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 22, role: "delivery_partner" },
          order_id: 12,
          status: "in_transit",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You are not assigned to this order as delivery partner",
      });
    });

    test("rejects status updates from unsupported roles", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValue({
        id: 11,
        order_status: "pending",
        field_agent_id: 7,
        delivery_partner_id: 20,
      });

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "buyer" },
          order_id: 11,
          status: "confirmed",
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Only field agents and delivery partners can update order status",
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

  describe("orderController (unit)", () => {
    const loadOrderController = () => {
      jest.resetModules();

      const orderServiceMock = {
        createOrder: jest.fn(),
        getOrdersForBuyer: jest.fn(),
        getOrderByIdForBuyer: jest.fn(),
        updateOrderStatus: jest.fn(),
      };

      const deliveryServiceMock = {
        assignDeliveryPartnerToOrder: jest.fn(),
      };

      const loggerMock = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      };

      jest.doMock("../src/services/orderService", () => orderServiceMock);
      jest.doMock("../src/services/deliveryService", () => deliveryServiceMock);
      jest.doMock("../src/utils/logger", () => loggerMock);

      const controller = require("../src/controllers/orderController");
      return { controller, orderServiceMock, deliveryServiceMock, loggerMock };
    };

    const createMockRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test("createOrder and getUserOrders delegate to order service", async () => {
      const { controller, orderServiceMock } = loadOrderController();

      orderServiceMock.createOrder.mockResolvedValue({ id: 15 });
      const res1 = createMockRes();
      await controller.createOrder({ user: { id: 3 }, body: undefined }, res1);
      expect(orderServiceMock.createOrder).toHaveBeenCalledWith(3, {});
      expect(res1.status).toHaveBeenCalledWith(201);

      orderServiceMock.getOrdersForBuyer.mockResolvedValue([{ id: 15 }]);
      const res2 = createMockRes();
      await controller.getUserOrders({ user: { id: 3 } }, res2);
      expect(orderServiceMock.getOrdersForBuyer).toHaveBeenCalledWith(3);
      expect(res2.status).toHaveBeenCalledWith(200);
    });

    test("getOrderById and updateOrderStatus forward ids and status aliases", async () => {
      const { controller, orderServiceMock } = loadOrderController();

      orderServiceMock.getOrderByIdForBuyer.mockResolvedValue({ id: 4 });
      const res1 = createMockRes();
      await controller.getOrderById({ user: { id: 3 }, params: { id: "4" } }, res1);
      expect(orderServiceMock.getOrderByIdForBuyer).toHaveBeenCalledWith(3, "4");
      expect(res1.status).toHaveBeenCalledWith(200);

      orderServiceMock.updateOrderStatus.mockResolvedValue({ id: 8, order_status: "confirmed" });
      const res2 = createMockRes();
      await controller.updateOrderStatus(
        {
          user: { id: 7, role: "field_agent" },
          params: { id: "8" },
          body: { order_status: "confirmed" },
        },
        res2
      );
      expect(orderServiceMock.updateOrderStatus).toHaveBeenCalledWith({
        actor: { id: 7, role: "field_agent" },
        order_id: "8",
        status: "confirmed",
      });
      expect(res2.status).toHaveBeenCalledWith(200);
    });

    test("assignDeliveryPartner delegates to delivery service", async () => {
      const { controller, deliveryServiceMock } = loadOrderController();

      deliveryServiceMock.assignDeliveryPartnerToOrder.mockResolvedValue({
        id: 8,
        delivery_partner_id: 22,
      });

      const res = createMockRes();
      await controller.assignDeliveryPartner(
        {
          user: { id: 1, role: "admin" },
          params: { id: "8" },
          body: { delivery_partner_id: 22 },
        },
        res
      );

      expect(deliveryServiceMock.assignDeliveryPartnerToOrder).toHaveBeenCalledWith({
        actor: { id: 1, role: "admin" },
        order_id: "8",
        delivery_partner_id: 22,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("controller methods propagate statusCode errors and mask unexpected ones", async () => {
      const { controller, orderServiceMock, deliveryServiceMock, loggerMock } = loadOrderController();

      orderServiceMock.createOrder.mockRejectedValueOnce(
        Object.assign(new Error("Cart is empty"), { statusCode: 400 })
      );
      const res1 = createMockRes();
      await controller.createOrder({ user: { id: 3 }, body: {} }, res1);
      expect(res1.status).toHaveBeenCalledWith(400);

      orderServiceMock.getOrdersForBuyer.mockRejectedValueOnce(new Error("boom"));
      const res2 = createMockRes();
      await controller.getUserOrders({ user: { id: 3 } }, res2);
      expect(res2.status).toHaveBeenCalledWith(500);

      orderServiceMock.getOrderByIdForBuyer.mockRejectedValueOnce(
        Object.assign(new Error("Order not found"), { statusCode: 404 })
      );
      const res3 = createMockRes();
      await controller.getOrderById({ user: { id: 3 }, params: { id: "44" } }, res3);
      expect(res3.status).toHaveBeenCalledWith(404);

      orderServiceMock.updateOrderStatus.mockRejectedValueOnce(new Error("db down"));
      const res4 = createMockRes();
      await controller.updateOrderStatus(
        { user: { id: 3 }, params: { id: "44" }, body: { status: "confirmed" } },
        res4
      );
      expect(res4.status).toHaveBeenCalledWith(500);

      deliveryServiceMock.assignDeliveryPartnerToOrder.mockRejectedValueOnce(
        Object.assign(new Error("Order not found"), { statusCode: 404 })
      );
      const res5 = createMockRes();
      await controller.assignDeliveryPartner(
        { user: { id: 1 }, params: { id: "44" }, body: { delivery_partner_id: 22 } },
        res5
      );
      expect(res5.status).toHaveBeenCalledWith(404);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
});
