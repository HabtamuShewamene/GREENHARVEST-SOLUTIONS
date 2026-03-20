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
  });
});
