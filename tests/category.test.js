const request = require("supertest");

const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

const loadCategoryService = () => {
  jest.resetModules();

  jest.doMock("../src/models/categoryModel", () => ({
    createCategory: jest.fn(),
    deleteCategoryById: jest.fn(),
    findCategoryById: jest.fn(),
    findCategoryByName: jest.fn(),
    getAllCategories: jest.fn(),
    updateCategoryById: jest.fn(),
  }));

  const categoryService = require("../src/services/categoryService");
  const categoryModel = require("../src/models/categoryModel");

  return { categoryService, categoryModel };
};

const buildCategoryApp = (categoryServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/categoryService", () => categoryServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const categoryRoutes = require("../src/routes/categoryRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");

  return createRouteApp("/api/categories", categoryRoutes);
};

describe("Category tests", () => {
  describe("categoryService", () => {
    test("createCategory creates a new category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryByName.mockResolvedValue(null);
      categoryModel.createCategory.mockResolvedValue({
        id: 5,
        category_name: "Vegetables",
      });

      const category = await categoryService.createCategory({
        category_name: " Vegetables ",
        description: "Fresh stock",
      });

      expect(categoryModel.createCategory).toHaveBeenCalledWith({
        category_name: "Vegetables",
        description: "Fresh stock",
      });
      expect(category.id).toBe(5);
    });

    test("createCategory rejects missing category_name", async () => {
      const { categoryService } = loadCategoryService();

      await expect(
        categoryService.createCategory({
          description: "Fresh stock",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Category name is required",
      });
    });
  });

  describe("category routes", () => {
    let categoryServiceMock;
    let app;

    beforeEach(() => {
      categoryServiceMock = {
        createCategory: jest.fn(),
        deleteCategory: jest.fn(),
        getAllCategories: jest.fn(),
        getCategoryById: jest.fn(),
        updateCategory: jest.fn(),
      };

      app = buildCategoryApp(categoryServiceMock);
    });

    test("admin can create a category", async () => {
      categoryServiceMock.createCategory.mockResolvedValue({
        id: 1,
        category_name: "Vegetables",
      });

      const response = await request(app)
        .post("/api/categories")
        .set("x-test-role", "admin")
        .send({
          category_name: "Vegetables",
          description: "Fresh produce",
        });

      expect(response.status).toBe(201);
      expect(response.body.category.category_name).toBe("Vegetables");
    });

    test("rejects missing category_name", async () => {
      categoryServiceMock.createCategory.mockRejectedValue(
        Object.assign(new Error("Category name is required"), { statusCode: 400 })
      );

      const response = await request(app)
        .post("/api/categories")
        .set("x-test-role", "admin")
        .send({
          description: "Fresh produce",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Category name is required");
    });

    test("fetches categories", async () => {
      categoryServiceMock.getAllCategories.mockResolvedValue([
        { id: 1, category_name: "Vegetables" },
        { id: 2, category_name: "Fruits" },
      ]);

      const response = await request(app).get("/api/categories");

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);
    });

    test("enforces admin-only category management", async () => {
      const response = await request(app)
        .post("/api/categories")
        .set("x-test-role", "buyer")
        .send({
          category_name: "Vegetables",
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Required role: admin");
    });
  });
});
