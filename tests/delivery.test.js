const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadDeliveryService = () => {
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

  jest.doMock("../src/models/deliveryModel", () => ({
    createDelivery: jest.fn(),
    findDeliveryByIdForUpdate: jest.fn(),
    findDeliveryByOrderIdForUpdate: jest.fn(),
    findDeliveryPartnerById: jest.fn(),
    findOrderById: jest.fn(),
    getDeliveryByOrderId: jest.fn(),
    updateDeliveryByOrderId: jest.fn(),
    updateOrderDeliveryStatus: jest.fn(),
  }));

  jest.doMock("../src/models/orderModel", () => ({
    assignDeliveryPartnerById: jest.fn(),
    findOrderById: jest.fn(),
  }));

  const deliveryService = require("../src/services/deliveryService");
  const deliveryModel = require("../src/models/deliveryModel");
  const orderModel = require("../src/models/orderModel");

  return { deliveryService, deliveryModel, orderModel, client };
};

const buildOrderAssignmentApp = (deliveryServiceMock, orderServiceMock = {}) => {
  jest.resetModules();
  jest.doMock("../src/services/deliveryService", () => deliveryServiceMock);
  jest.doMock("../src/services/orderService", () => ({
    createOrder: jest.fn(),
    getOrdersForBuyer: jest.fn(),
    getOrderByIdForBuyer: jest.fn(),
    updateOrderStatus: jest.fn(),
    ...orderServiceMock,
  }));
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const orderRoutes = require("../src/routes/orderRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/orders", orderRoutes);
};

describe("Delivery tests", () => {
  describe("deliveryService assignment", () => {
    test("assigns a delivery partner to an existing order", async () => {
      const { deliveryService, deliveryModel, orderModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }

        return { rows: [] };
      });

      orderModel.findOrderById.mockResolvedValue({ id: 4 });
      deliveryModel.findDeliveryPartnerById.mockResolvedValue({ id: 22, user_id: 22 });
      orderModel.assignDeliveryPartnerById.mockResolvedValue({
        id: 4,
        delivery_partner_id: 22,
      });

      const order = await deliveryService.assignDeliveryPartnerToOrder({
        actor: { id: 1, role: "admin" },
        order_id: 4,
        delivery_partner_id: 22,
      });

      expect(order.delivery_partner_id).toBe(22);
    });

    test("rejects invalid ids when assigning delivery partner to order", async () => {
      const { deliveryService } = loadDeliveryService();

      await expect(
        deliveryService.assignDeliveryPartnerToOrder({
          actor: { id: 1, role: "admin" },
          order_id: "bad",
          delivery_partner_id: 22,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "order_id and delivery_partner_id must be valid integers",
      });
    });

    test("rejects non-delivery users", async () => {
      const { deliveryService, deliveryModel, orderModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        return { rows: [] };
      });

      orderModel.findOrderById.mockResolvedValue({ id: 4 });
      deliveryModel.findDeliveryPartnerById.mockResolvedValue(null);

      await expect(
        deliveryService.assignDeliveryPartnerToOrder({
          actor: { id: 1, role: "admin" },
          order_id: 4,
          delivery_partner_id: 99,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("rejects unauthorized assignment access", async () => {
      const { deliveryService } = loadDeliveryService();

      await expect(
        deliveryService.assignDeliveryPartnerToOrder({
          actor: { id: 9, role: "buyer" },
          order_id: 4,
          delivery_partner_id: 22,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    test("rejects missing order when assigning delivery partner to order", async () => {
      const { deliveryService, orderModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }
        return { rows: [] };
      });
      orderModel.findOrderById.mockResolvedValue(null);

      await expect(
        deliveryService.assignDeliveryPartnerToOrder({
          actor: { id: 1, role: "admin" },
          order_id: 404,
          delivery_partner_id: 22,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("deliveryService workflow and tracking", () => {
    test("assignDelivery creates a delivery record", async () => {
      const { deliveryService, deliveryModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }
        return { rows: [] };
      });

      deliveryModel.findOrderById.mockResolvedValue({ id: 8 });
      deliveryModel.findDeliveryPartnerById.mockResolvedValue({ id: 22 });
      deliveryModel.findDeliveryByOrderIdForUpdate.mockResolvedValue(null);
      deliveryModel.createDelivery.mockResolvedValue({ id: 5, order_id: 8, delivery_partner_id: 22 });
      deliveryModel.updateOrderDeliveryStatus.mockResolvedValue(undefined);

      const delivery = await deliveryService.assignDelivery({
        actor: { id: 1, role: "admin" },
        payload: {
          order_id: 8,
          delivery_partner_id: 22,
          delivery_location: "Addis",
        },
      });

      expect(delivery.id).toBe(5);
    });

    test("assignDelivery rejects non-admin actors and missing delivery location", async () => {
      const { deliveryService } = loadDeliveryService();

      await expect(
        deliveryService.assignDelivery({
          actor: { id: 9, role: "buyer" },
          payload: { order_id: 8, delivery_partner_id: 22, delivery_location: "Addis" },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Only admins can assign delivery partners",
      });

      await expect(
        deliveryService.assignDelivery({
          actor: { id: 1, role: "admin" },
          payload: { order_id: 8, delivery_partner_id: 22 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "delivery_location is required",
      });
    });

    test("assignDelivery rejects duplicate assignment", async () => {
      const { deliveryService, deliveryModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }
        return { rows: [] };
      });

      deliveryModel.findOrderById.mockResolvedValue({ id: 8 });
      deliveryModel.findDeliveryPartnerById.mockResolvedValue({ id: 22 });
      deliveryModel.findDeliveryByOrderIdForUpdate.mockResolvedValue({ id: 3 });

      await expect(
        deliveryService.assignDelivery({
          actor: { id: 1, role: "admin" },
          payload: {
            order_id: 8,
            delivery_partner_id: 22,
            delivery_location: "Addis",
          },
        })
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    test("updateDeliveryStatus validates required fields and id formats", async () => {
      const { deliveryService } = loadDeliveryService();

      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: { order_id: 8 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "status is required",
      });

      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: { order_id: "bad", status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "order_id must be a valid integer",
      });

      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: { delivery_id: "bad", status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "delivery_id must be a valid integer",
      });

      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: { status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "order_id or delivery_id is required",
      });
    });

    test("updateDeliveryStatus rejects invalid status", async () => {
      const { deliveryService } = loadDeliveryService();

      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: {
            order_id: 8,
            status: "teleported",
          },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("updateDeliveryStatus rejects missing delivery/order, forbidden role, and unassigned partner", async () => {
      const { deliveryService, deliveryModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }
        return { rows: [] };
      });

      deliveryModel.findDeliveryByOrderIdForUpdate.mockResolvedValue(null);
      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: { order_id: 8, status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Delivery not found for this order",
      });

      deliveryModel.findDeliveryByOrderIdForUpdate.mockResolvedValue({
        id: 3,
        order_id: 8,
        delivery_partner_id: 22,
      });
      deliveryModel.findOrderById.mockResolvedValue(null);
      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 22, role: "delivery_partner" },
          payload: { order_id: 8, status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Order not found",
      });

      deliveryModel.findOrderById.mockResolvedValue({ id: 8 });
      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 1, role: "admin" },
          payload: { order_id: 8, status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Only delivery partners can update delivery status",
      });

      await expect(
        deliveryService.updateDeliveryStatus({
          actor: { id: 23, role: "delivery_partner" },
          payload: { order_id: 8, status: "shipped" },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You are not allowed to update this delivery",
      });
    });

    test("updateDeliveryStatus updates using delivery_id path", async () => {
      const { deliveryService, deliveryModel, client } = loadDeliveryService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }
        return { rows: [] };
      });

      deliveryModel.findDeliveryByIdForUpdate.mockResolvedValue({
        id: 3,
        order_id: 8,
        delivery_partner_id: 22,
      });
      deliveryModel.findOrderById.mockResolvedValue({ id: 8 });
      deliveryModel.updateDeliveryByOrderId.mockResolvedValue({ id: 3, status: "shipped" });
      deliveryModel.updateOrderDeliveryStatus.mockResolvedValue(undefined);

      const delivery = await deliveryService.updateDeliveryStatus({
        actor: { id: 22, role: "delivery_partner" },
        payload: {
          delivery_id: 3,
          status: "shipped",
        },
      });

      expect(delivery.status).toBe("shipped");
    });

    test("trackDelivery allows admin and rejects invalid order ids", async () => {
      const { deliveryService, deliveryModel } = loadDeliveryService();

      await expect(
        deliveryService.trackDelivery({
          actor: { id: 1, role: "admin" },
          order_id: "bad",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
      });

      deliveryModel.getDeliveryByOrderId.mockResolvedValue({
        id: 4,
        buyer_id: 10,
        delivery_partner_id: 22,
      });

      const delivery = await deliveryService.trackDelivery({
        actor: { id: 1, role: "admin" },
        order_id: 8,
      });

      expect(delivery.id).toBe(4);
    });

    test("trackDelivery rejects forbidden actors", async () => {
      const { deliveryService, deliveryModel } = loadDeliveryService();

      deliveryModel.getDeliveryByOrderId.mockResolvedValue({
        id: 4,
        buyer_id: 10,
        delivery_partner_id: 22,
      });

      await expect(
        deliveryService.trackDelivery({
          actor: { id: 9, role: "field_agent" },
          order_id: 8,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You are not allowed to view this delivery",
      });
    });
  });

  describe("delivery assignment route", () => {
    test("admin can assign a delivery partner from order endpoint", async () => {
      const deliveryServiceMock = {
        assignDeliveryPartnerToOrder: jest.fn().mockResolvedValue({
          id: 4,
          delivery_partner_id: 22,
        }),
      };

      const app = buildOrderAssignmentApp(deliveryServiceMock);

      const response = await request(app)
        .put("/api/orders/4/assign-delivery")
        .set("x-test-role", "admin")
        .send({ delivery_partner_id: 22 });

      expect(response.status).toBe(200);
      expect(response.body.order.delivery_partner_id).toBe(22);
    });

    test("non-admin cannot assign a delivery partner", async () => {
      const deliveryServiceMock = {
        assignDeliveryPartnerToOrder: jest.fn(),
      };

      const app = buildOrderAssignmentApp(deliveryServiceMock);

      const response = await request(app)
        .put("/api/orders/4/assign-delivery")
        .set("x-test-role", "buyer")
        .send({ delivery_partner_id: 22 });

      expect(response.status).toBe(403);
      expect(deliveryServiceMock.assignDeliveryPartnerToOrder).not.toHaveBeenCalled();
    });
  });

  describe("delivery routes and controllers", () => {
    test("assign route delegates to controller and service", async () => {
      jest.resetModules();
      const deliveryServiceMock = {
        assignDelivery: jest.fn().mockResolvedValue({ id: 4 }),
        updateDeliveryStatus: jest.fn(),
        trackDelivery: jest.fn(),
      };
      jest.doMock("../src/services/deliveryService", () => deliveryServiceMock);
      jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

      const deliveryRoutes = require("../src/routes/deliveryRoutes");
      const { createRouteApp } = require("./helpers/createRouteApp");
      const app = createRouteApp("/api/delivery", deliveryRoutes);

      const response = await request(app)
        .post("/api/delivery/assign")
        .set("x-test-role", "admin")
        .send({ order_id: 8, delivery_partner_id: 22, delivery_location: "Addis" });

      expect(response.status).toBe(201);
      expect(deliveryServiceMock.assignDelivery).toHaveBeenCalled();
    });

    test("update status route delegates to controller", async () => {
      jest.resetModules();
      const deliveryServiceMock = {
        assignDelivery: jest.fn(),
        updateDeliveryStatus: jest.fn().mockResolvedValue({ id: 4, status: "shipped" }),
        trackDelivery: jest.fn(),
      };
      jest.doMock("../src/services/deliveryService", () => deliveryServiceMock);
      jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

      const deliveryRoutes = require("../src/routes/deliveryRoutes");
      const { createRouteApp } = require("./helpers/createRouteApp");
      const app = createRouteApp("/api/delivery", deliveryRoutes);

      const response = await request(app)
        .patch("/api/delivery/4/status")
        .set("x-test-role", "delivery_partner")
        .send({ status: "shipped" });

      expect(response.status).toBe(200);
      expect(response.body.delivery.status).toBe("shipped");
    });

    test("track route supports orderId param and service failures", async () => {
      jest.resetModules();
      const deliveryServiceMock = {
        assignDelivery: jest.fn(),
        updateDeliveryStatus: jest.fn(),
        trackDelivery: jest
          .fn()
          .mockResolvedValueOnce({ id: 9 })
          .mockRejectedValueOnce(
            Object.assign(new Error("Delivery not found for this order"), { statusCode: 404 })
          ),
      };
      jest.doMock("../src/services/deliveryService", () => deliveryServiceMock);
      jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

      const deliveryRoutes = require("../src/routes/deliveryRoutes");
      const { createRouteApp } = require("./helpers/createRouteApp");
      const app = createRouteApp("/api/delivery", deliveryRoutes);

      const okResponse = await request(app)
        .get("/api/delivery/track/8")
        .set("x-test-role", "buyer");

      const failResponse = await request(app)
        .get("/api/delivery/404")
        .set("x-test-role", "buyer");

      expect(okResponse.status).toBe(200);
      expect(failResponse.status).toBe(404);
    });
  });
});
