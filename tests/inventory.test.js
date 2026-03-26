const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadInventoryService = () => {
  jest.resetModules();

  jest.doMock("../src/models/agentModel", () => ({
    isAgentAssignedToFarmer: jest.fn(),
  }));
  jest.doMock("../src/models/inventoryModel", () => ({
    getInventoryByProductId: jest.fn(),
    upsertInventory: jest.fn(),
  }));
  jest.doMock("../src/models/productModel", () => ({
    findProductOwnershipById: jest.fn(),
  }));

  const inventoryService = require("../src/services/inventoryService");
  const agentModel = require("../src/models/agentModel");
  const inventoryModel = require("../src/models/inventoryModel");
  const productModel = require("../src/models/productModel");

  return {
    agentModel,
    inventoryModel,
    inventoryService,
    productModel,
  };
};

const buildInventoryApp = (inventoryServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/inventoryService", () => inventoryServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const inventoryRoutes = require("../src/routes/inventoryRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/inventory", inventoryRoutes);
};

describe("Inventory API", () => {
  describe("inventoryService", () => {
    test("farmer updates stock successfully", async () => {
      const { inventoryService, inventoryModel, productModel } = loadInventoryService();

      productModel.findProductOwnershipById.mockResolvedValue({
        id: 3,
        farmer_id: 7,
      });
      inventoryModel.upsertInventory.mockResolvedValue({
        id: 21,
        product_id: 3,
        farmer_id: 7,
        quantity: 12,
      });

      const inventory = await inventoryService.updateInventory({
        actor: { id: 7, role: "farmer" },
        payload: { product_id: 3, quantity: 12 },
      });

      expect(inventoryModel.upsertInventory).toHaveBeenCalledWith({
        product_id: 3,
        farmer_id: 7,
        quantity: 12,
      });
      expect(inventory.quantity).toBe(12);
    });

    test("assigned field agent updates farmer inventory successfully", async () => {
      const { agentModel, inventoryService, inventoryModel, productModel } = loadInventoryService();

      productModel.findProductOwnershipById.mockResolvedValue({
        id: 8,
        farmer_id: 15,
      });
      agentModel.isAgentAssignedToFarmer.mockResolvedValue(true);
      inventoryModel.upsertInventory.mockResolvedValue({
        id: 22,
        product_id: 8,
        farmer_id: 15,
        quantity: 4,
      });

      const inventory = await inventoryService.updateInventory({
        actor: { id: 99, role: "field_agent" },
        payload: { product_id: 8, quantity: 4 },
      });

      expect(agentModel.isAgentAssignedToFarmer).toHaveBeenCalledWith({
        agent_id: 99,
        farmer_id: 15,
      });
      expect(inventory.quantity).toBe(4);
    });

    test("rejects invalid product ids, SQL injection-like input, and negative stock", async () => {
      const { inventoryService } = loadInventoryService();

      await expect(
        inventoryService.updateInventory({
          actor: { id: 1, role: "admin" },
          payload: { product_id: "1 OR 1=1", quantity: 5 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "product_id and non-negative integer quantity are required",
      });

      await expect(
        inventoryService.updateInventory({
          actor: { id: 1, role: "admin" },
          payload: { product_id: 3, quantity: -1 },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "product_id and non-negative integer quantity are required",
      });
    });

    test("rejects unauthorized stock updates and missing products", async () => {
      const { agentModel, inventoryService, productModel } = loadInventoryService();

      productModel.findProductOwnershipById.mockResolvedValueOnce(null);
      await expect(
        inventoryService.updateInventory({
          actor: { id: 1, role: "admin" },
          payload: { product_id: 50, quantity: 1 },
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Product not found",
      });

      productModel.findProductOwnershipById.mockResolvedValueOnce({
        id: 8,
        farmer_id: 15,
      });
      await expect(
        inventoryService.updateInventory({
          actor: { id: 20, role: "buyer" },
          payload: { product_id: 8, quantity: 3 },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Forbidden: insufficient permissions",
      });

      productModel.findProductOwnershipById.mockResolvedValueOnce({
        id: 8,
        farmer_id: 15,
      });
      agentModel.isAgentAssignedToFarmer.mockResolvedValue(false);
      await expect(
        inventoryService.updateInventory({
          actor: { id: 44, role: "field_agent" },
          payload: { product_id: 8, quantity: 3 },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Forbidden: insufficient permissions",
      });
    });

    test("fetches inventory by product id and validates missing records", async () => {
      const { inventoryService, inventoryModel } = loadInventoryService();

      await expect(inventoryService.getInventoryByProductId("bad")).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product id",
      });

      inventoryModel.getInventoryByProductId.mockResolvedValueOnce(null);
      await expect(inventoryService.getInventoryByProductId(77)).rejects.toMatchObject({
        statusCode: 404,
        message: "Inventory not found for this product",
      });

      inventoryModel.getInventoryByProductId.mockResolvedValueOnce({
        product_id: 9,
        quantity: 6,
      });
      const inventory = await inventoryService.getInventoryByProductId(9);
      expect(inventory.quantity).toBe(6);
    });
  });

  describe("inventory routes", () => {
    let app;
    let inventoryServiceMock;

    beforeEach(() => {
      inventoryServiceMock = {
        getInventoryByProductId: jest.fn(),
        updateInventory: jest.fn(),
      };

      app = buildInventoryApp(inventoryServiceMock);
    });

    test("field agent can update inventory through the route", async () => {
      inventoryServiceMock.updateInventory.mockResolvedValue({
        id: 1,
        product_id: 5,
        quantity: 8,
      });

      const response = await request(app)
        .put("/api/inventory/update")
        .set("x-test-role", "field_agent")
        .send({ product_id: 5, quantity: 8 });

      expect(response.status).toBe(200);
      expect(response.body.inventory.quantity).toBe(8);
      expect(inventoryServiceMock.updateInventory).toHaveBeenCalledWith({
        actor: expect.objectContaining({ role: "field_agent" }),
        payload: { product_id: 5, quantity: 8 },
      });
    });

    test("buyer cannot update inventory", async () => {
      const response = await request(app)
        .put("/api/inventory/update")
        .set("x-test-role", "buyer")
        .send({ product_id: 5, quantity: 8 });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Required role: admin, farmer, field_agent");
      expect(inventoryServiceMock.updateInventory).not.toHaveBeenCalled();
    });

    test("inventory routes require authentication", async () => {
      const response = await request(app).get("/api/inventory/5");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication is required");
    });

    test("fetches product inventory and maps service errors", async () => {
      inventoryServiceMock.getInventoryByProductId.mockResolvedValueOnce({
        product_id: 5,
        quantity: 11,
      });

      const okResponse = await request(app)
        .get("/api/inventory/5")
        .set("x-test-role", "admin");

      expect(okResponse.status).toBe(200);
      expect(okResponse.body.inventory.quantity).toBe(11);

      inventoryServiceMock.getInventoryByProductId.mockRejectedValueOnce(
        Object.assign(new Error("Inventory not found for this product"), { statusCode: 404 })
      );

      const failResponse = await request(app)
        .get("/api/inventory/404")
        .set("x-test-role", "admin");

      expect(failResponse.status).toBe(404);
      expect(failResponse.body.message).toBe("Inventory not found for this product");
    });
  });
});
