const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadProductService = () => {
  jest.resetModules();

  jest.doMock("../src/models/categoryModel", () => ({
    findCategoryById: jest.fn(),
  }));
  jest.doMock("../src/models/inventoryModel", () => ({
    upsertInventory: jest.fn(),
  }));
  jest.doMock("../src/models/productModel", () => ({
    createProduct: jest.fn(),
    deleteProductById: jest.fn(),
    findAllProducts: jest.fn(),
    findFarmerById: jest.fn(),
    findProductById: jest.fn(),
    findProductOwnershipById: jest.fn(),
    updateProductById: jest.fn(),
  }));

  const productService = require("../src/services/productService");
  const categoryModel = require("../src/models/categoryModel");
  const inventoryModel = require("../src/models/inventoryModel");
  const productModel = require("../src/models/productModel");

  return { productService, categoryModel, inventoryModel, productModel };
};

const buildProductApp = (productServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/productService", () => productServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const productRoutes = require("../src/routes/productRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/products", productRoutes);
};

describe("Product tests", () => {
  describe("productService", () => {
    test("field_agent can create a product linked to a farmer", async () => {
      const { productService, categoryModel, inventoryModel, productModel } = loadProductService();

      categoryModel.findCategoryById.mockResolvedValue({ id: 2 });
      productModel.findFarmerById.mockResolvedValue({ id: 8 });
      productModel.createProduct.mockResolvedValue({ id: 15, name: "Tomato" });
      productModel.findProductById.mockResolvedValue({
        id: 15,
        farmer_id: 8,
        name: "Tomato",
      });

      const product = await productService.createProduct({
        user: { id: 3, role: "field_agent" },
        payload: {
          farmer_id: 8,
          category_id: 2,
          name: "Tomato",
          price: 12,
          stock: 6,
        },
      });

      expect(productModel.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          farmer_id: 8,
          category_id: 2,
        })
      );
      expect(inventoryModel.upsertInventory).toHaveBeenCalledWith({
        product_id: 15,
        farmer_id: 8,
        quantity: 6,
      });
      expect(product.id).toBe(15);
    });

    test("rejects invalid farmer_id", async () => {
      const { productService, productModel } = loadProductService();

      productModel.findFarmerById.mockResolvedValue(null);

      await expect(
        productService.createProduct({
          user: { id: 3, role: "field_agent" },
          payload: {
            farmer_id: 999,
            name: "Tomato",
            price: 12,
            stock: 6,
          },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid farmer_id. Referenced farmer does not exist",
      });
    });

    test("rejects unauthorized product creation role", async () => {
      const { productService } = loadProductService();

      await expect(
        productService.createProduct({
          user: { id: 7, role: "buyer" },
          payload: {
            farmer_id: 1,
            name: "Tomato",
            price: 12,
            stock: 6,
          },
        })
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    test("getProductById rejects invalid id", async () => {
      const { productService } = loadProductService();

      await expect(productService.getProductById("abc")).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product id",
      });
    });

    test("getProductById rejects missing product", async () => {
      const { productService, productModel } = loadProductService();

      productModel.findProductById.mockResolvedValue(null);

      await expect(productService.getProductById(999)).rejects.toMatchObject({
        statusCode: 404,
        message: "Product not found",
      });
    });

    test("updateProduct rejects empty payload", async () => {
      const { productService, productModel } = loadProductService();

      productModel.findProductOwnershipById.mockResolvedValue({ id: 12, farmer_id: 7 });

      await expect(
        productService.updateProduct({
          user: { id: 7, role: "farmer" },
          productId: 12,
          payload: {},
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "At least one field is required for update",
      });
    });

    test("deleteProduct rejects unauthorized farmer", async () => {
      const { productService, productModel } = loadProductService();

      productModel.findProductOwnershipById.mockResolvedValue({ id: 12, farmer_id: 11 });

      await expect(
        productService.deleteProduct({
          user: { id: 7, role: "farmer" },
          productId: 12,
        })
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("productController (unit)", () => {
    const loadProductController = () => {
      jest.resetModules();

      const productServiceMock = {
        createProduct: jest.fn(),
        updateProduct: jest.fn(),
        deleteProduct: jest.fn(),
        getAllProducts: jest.fn(),
        getProductById: jest.fn(),
        updateProductStock: jest.fn(),
      };

      const loggerMock = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      };

      jest.doMock("../src/services/productService", () => productServiceMock);
      jest.doMock("../src/utils/logger", () => loggerMock);

      const controller = require("../src/controllers/productController");
      return { controller, productServiceMock, loggerMock };
    };

    const createMockRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test("createProduct validates request body and actor role", async () => {
      const { controller, productServiceMock } = loadProductController();

      const res1 = createMockRes();
      await controller.createProduct({ user: { id: 1, role: "field_agent" }, body: null }, res1);
      expect(res1.status).toHaveBeenCalledWith(400);
      expect(productServiceMock.createProduct).not.toHaveBeenCalled();

      const res2 = createMockRes();
      await controller.createProduct(
        { user: { id: 1, role: "buyer" }, body: { farmer_id: 8 } },
        res2
      );
      expect(res2.status).toHaveBeenCalledWith(403);
      expect(productServiceMock.createProduct).not.toHaveBeenCalled();
    });

    test("createProduct validates farmer_id presence and type", async () => {
      const { controller, productServiceMock } = loadProductController();

      const res1 = createMockRes();
      await controller.createProduct(
        { user: { id: 1, role: "field_agent" }, body: { name: "Tomato" } },
        res1
      );
      expect(res1.status).toHaveBeenCalledWith(400);
      expect(res1.json).toHaveBeenCalledWith({ message: "farmer_id is required" });
      expect(productServiceMock.createProduct).not.toHaveBeenCalled();

      const res2 = createMockRes();
      await controller.createProduct(
        { user: { id: 1, role: "field_agent" }, body: { farmer_id: "bad" } },
        res2
      );
      expect(res2.status).toHaveBeenCalledWith(400);
      expect(res2.json).toHaveBeenCalledWith({ message: "farmer_id must be a valid integer" });
      expect(productServiceMock.createProduct).not.toHaveBeenCalled();
    });

    test("createProduct passes numeric farmer_id to the service", async () => {
      const { controller, productServiceMock } = loadProductController();

      productServiceMock.createProduct.mockResolvedValue({ id: 1, farmer_id: 8, name: "Tomato" });

      const res = createMockRes();
      await controller.createProduct(
        {
          user: { id: 1, role: "field_agent" },
          body: { farmer_id: "8", name: "Tomato", price: 12, stock: 3 },
        },
        res
      );

      expect(productServiceMock.createProduct).toHaveBeenCalledWith({
        user: { id: 1, role: "field_agent" },
        payload: expect.objectContaining({ farmer_id: 8 }),
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("handleControllerError maps postgres codes and masks unknown errors", async () => {
      const { controller, productServiceMock } = loadProductController();

      productServiceMock.createProduct.mockRejectedValueOnce(
        Object.assign(new Error("fk"), { code: "23503", detail: "missing farmer" })
      );
      const res1 = createMockRes();
      await controller.createProduct(
        { user: { id: 1, role: "field_agent" }, body: { farmer_id: 8, name: "Tomato" } },
        res1
      );
      expect(res1.status).toHaveBeenCalledWith(400);
      expect(res1.json).toHaveBeenCalledWith({
        message: "Referenced record does not exist",
        detail: "missing farmer",
      });

      productServiceMock.createProduct.mockRejectedValueOnce(
        Object.assign(new Error("bad format"), { code: "22P02" })
      );
      const res2 = createMockRes();
      await controller.createProduct(
        { user: { id: 1, role: "field_agent" }, body: { farmer_id: 8, name: "Tomato" } },
        res2
      );
      expect(res2.status).toHaveBeenCalledWith(400);
      expect(res2.json).toHaveBeenCalledWith({ message: "Invalid input format" });

      productServiceMock.createProduct.mockRejectedValueOnce(new Error("db down"));
      const res3 = createMockRes();
      await controller.createProduct(
        { user: { id: 1, role: "field_agent" }, body: { farmer_id: 8, name: "Tomato" } },
        res3
      );
      expect(res3.status).toHaveBeenCalledWith(500);
      expect(res3.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });

    test("updateProduct and updateProductStock validate request bodies", async () => {
      const { controller, productServiceMock } = loadProductController();

      const res1 = createMockRes();
      await controller.updateProduct({ user: { id: 1 }, params: { id: "1" }, body: null }, res1);
      expect(res1.status).toHaveBeenCalledWith(400);
      expect(productServiceMock.updateProduct).not.toHaveBeenCalled();

      const res2 = createMockRes();
      await controller.updateProductStock(
        { user: { id: 1 }, params: { id: "1" }, body: null },
        res2
      );
      expect(res2.status).toHaveBeenCalledWith(400);
      expect(productServiceMock.updateProductStock).not.toHaveBeenCalled();
    });

    test("getAllProducts maps service failures", async () => {
      const { controller, productServiceMock } = loadProductController();

      productServiceMock.getAllProducts.mockRejectedValue(
        Object.assign(new Error("boom"), { statusCode: 503 })
      );

      const res = createMockRes();
      await controller.getAllProducts({}, res);
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe("product routes", () => {
    let productServiceMock;
    let app;

    beforeEach(() => {
      productServiceMock = {
        createProduct: jest.fn(),
        updateProduct: jest.fn(),
        deleteProduct: jest.fn(),
        getAllProducts: jest.fn(),
        getProductById: jest.fn(),
        updateProductStock: jest.fn(),
      };

      app = buildProductApp(productServiceMock);
    });

    test("field_agent can create product", async () => {
      productServiceMock.createProduct.mockResolvedValue({
        id: 1,
        farmer_id: 8,
        name: "Tomato",
      });

      const response = await request(app)
        .post("/api/products")
        .set("x-test-role", "field_agent")
        .send({
          farmer_id: 8,
          name: "Tomato",
          price: 12,
          stock: 6,
        });

      expect(response.status).toBe(201);
      expect(response.body.product.farmer_id).toBe(8);
    });

    test("buyer cannot create product", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("x-test-role", "buyer")
        .send({
          farmer_id: 8,
          name: "Tomato",
          price: 12,
          stock: 6,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Required role: field_agent");
    });

    test("rejects invalid farmer_id before service call", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("x-test-role", "field_agent")
        .send({
          farmer_id: "not-an-int",
          name: "Tomato",
          price: 12,
          stock: 6,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("farmer_id must be a valid integer");
      expect(productServiceMock.createProduct).not.toHaveBeenCalled();
    });

    test("fetches products", async () => {
      productServiceMock.getAllProducts.mockResolvedValue([
        { id: 1, name: "Tomato" },
        { id: 2, name: "Potato" },
      ]);

      const response = await request(app).get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(2);
    });

    test("returns service error for invalid farmer_id during create", async () => {
      productServiceMock.createProduct.mockRejectedValue(
        Object.assign(new Error("Invalid farmer_id. Referenced farmer does not exist"), {
          statusCode: 400,
        })
      );

      const response = await request(app)
        .post("/api/products")
        .set("x-test-role", "field_agent")
        .send({
          farmer_id: 99,
          name: "Tomato",
          price: 12,
          stock: 6,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid farmer_id. Referenced farmer does not exist");
    });

    test("returns 400 for empty request body", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("x-test-role", "field_agent")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("farmer_id is required");
    });

    test("returns product fetch error", async () => {
      productServiceMock.getProductById.mockRejectedValue(
        Object.assign(new Error("Product not found"), { statusCode: 404 })
      );

      const response = await request(app).get("/api/products/999");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Product not found");
    });
  });
});
