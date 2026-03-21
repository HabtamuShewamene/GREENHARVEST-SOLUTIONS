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
    findDeliveryPartnerById: jest.fn(),
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
});
