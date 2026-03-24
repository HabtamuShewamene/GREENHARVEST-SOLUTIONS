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

    test("createCategory defaults description to null when omitted", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryByName.mockResolvedValue(null);
      categoryModel.createCategory.mockResolvedValue({
        id: 6,
        category_name: "Fruits",
        description: null,
      });

      await categoryService.createCategory({
        category_name: "Fruits",
      });

      expect(categoryModel.createCategory).toHaveBeenCalledWith({
        category_name: "Fruits",
        description: null,
      });
    });

    test("createCategory normalizes empty description to null", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryByName.mockResolvedValue(null);
      categoryModel.createCategory.mockResolvedValue({
        id: 7,
        category_name: "Grains",
        description: null,
      });

      await categoryService.createCategory({
        category_name: "Grains",
        description: "",
      });

      expect(categoryModel.createCategory).toHaveBeenCalledWith({
        category_name: "Grains",
        description: null,
      });
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

    test("createCategory rejects duplicate category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryByName.mockResolvedValue({ id: 1, category_name: "Vegetables" });

      await expect(
        categoryService.createCategory({
          category_name: "Vegetables",
          description: "dup",
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Category already exists",
      });
    });

    test("getAllCategories delegates to the model", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.getAllCategories.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const categories = await categoryService.getAllCategories();

      expect(categories).toHaveLength(2);
      expect(categoryModel.getAllCategories).toHaveBeenCalled();
    });

    test("getCategoryById rejects invalid id", async () => {
      const { categoryService } = loadCategoryService();

      await expect(categoryService.getCategoryById("abc")).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid category id",
      });
    });

    test("getCategoryById rejects missing category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue(null);

      await expect(categoryService.getCategoryById(99)).rejects.toMatchObject({
        statusCode: 404,
        message: "Category not found",
      });
    });

    test("updateCategory rejects invalid category_id", async () => {
      const { categoryService } = loadCategoryService();

      await expect(
        categoryService.updateCategory({
          category_id: "nope",
          category_name: "Vegetables",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid category id",
      });
    });

    test("updateCategory rejects missing category_name", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue({ id: 9, category_name: "Old" });

      await expect(
        categoryService.updateCategory({
          category_id: 9,
          category_name: "",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Category name is required",
      });
    });

    test("updateCategory rejects duplicate category names on different ids", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue({ id: 9, category_name: "Old" });
      categoryModel.findCategoryByName.mockResolvedValue({ id: 10, category_name: "Vegetables" });

      await expect(
        categoryService.updateCategory({
          category_id: 9,
          category_name: "Vegetables",
          description: "new",
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Category already exists",
      });
    });

    test("updateCategory rejects missing category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue(null);

      await expect(
        categoryService.updateCategory({
          category_id: 9,
          category_name: "Vegetables",
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Category not found",
      });
    });

    test("updateCategory updates existing category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue({ id: 9, category_name: "Old" });
      categoryModel.findCategoryByName.mockResolvedValue(null);
      categoryModel.updateCategoryById.mockResolvedValue({
        id: 9,
        category_name: "Vegetables",
        description: "Fresh",
      });

      const category = await categoryService.updateCategory({
        category_id: 9,
        category_name: " Vegetables ",
        description: "Fresh",
      });

      expect(category.id).toBe(9);
      expect(categoryModel.updateCategoryById).toHaveBeenCalledWith(9, {
        category_name: "Vegetables",
        description: "Fresh",
      });
    });

    test("deleteCategory rejects invalid id", async () => {
      const { categoryService } = loadCategoryService();

      await expect(categoryService.deleteCategory("nope")).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("deleteCategory rejects missing category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue(null);

      await expect(categoryService.deleteCategory(99)).rejects.toMatchObject({
        statusCode: 404,
        message: "Category not found",
      });
    });

    test("deleteCategory removes existing category", async () => {
      const { categoryService, categoryModel } = loadCategoryService();

      categoryModel.findCategoryById.mockResolvedValue({ id: 7 });
      categoryModel.deleteCategoryById.mockResolvedValue({ id: 7 });

      const result = await categoryService.deleteCategory(7);

      expect(result.id).toBe(7);
      expect(categoryModel.deleteCategoryById).toHaveBeenCalledWith(7);
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

    test("rejects unauthenticated category creation", async () => {
      const response = await request(app).post("/api/categories").send({
        category_name: "Vegetables",
      });

      expect(response.status).toBe(401);
    });

    test("returns category service failure for get by id", async () => {
      categoryServiceMock.getCategoryById.mockRejectedValue(
        Object.assign(new Error("Category not found"), { statusCode: 404 })
      );

      const response = await request(app).get("/api/categories/999");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Category not found");
    });
  });

  describe("categoryController (unit)", () => {
    const loadCategoryController = () => {
      jest.resetModules();

      const categoryServiceMock = {
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        deleteCategory: jest.fn(),
        getAllCategories: jest.fn(),
        getCategoryById: jest.fn(),
      };

      const loggerMock = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      };

      jest.doMock("../src/services/categoryService", () => categoryServiceMock);
      jest.doMock("../src/utils/logger", () => loggerMock);

      const controller = require("../src/controllers/categoryController");
      return { controller, categoryServiceMock, loggerMock };
    };

    const createMockRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test("createCategory returns 401 when req.user is missing", async () => {
      const { controller, categoryServiceMock } = loadCategoryController();
      const req = { body: { category_name: "Vegetables" } };
      const res = createMockRes();

      await controller.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(categoryServiceMock.createCategory).not.toHaveBeenCalled();
    });

    test("createCategory returns 403 when non-admin tries to create categories", async () => {
      const { controller, categoryServiceMock } = loadCategoryController();
      const req = { user: { id: 1, role: "buyer" }, body: { category_name: "Vegetables" } };
      const res = createMockRes();

      await controller.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(categoryServiceMock.createCategory).not.toHaveBeenCalled();
    });

    test("createCategory validates request body type", async () => {
      const { controller, categoryServiceMock } = loadCategoryController();
      const req = { user: { id: 1, role: "admin" }, body: null };
      const res = createMockRes();

      await controller.createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(categoryServiceMock.createCategory).not.toHaveBeenCalled();
    });

    test("createCategory maps service errors with statusCode and masks unknown errors", async () => {
      const { controller, categoryServiceMock, loggerMock } = loadCategoryController();

      const res1 = createMockRes();
      categoryServiceMock.createCategory.mockRejectedValueOnce(
        Object.assign(new Error("Category name is required"), { statusCode: 400 })
      );
      await controller.createCategory(
        { user: { id: 1, role: "admin" }, body: { category_name: "" } },
        res1
      );
      expect(res1.status).toHaveBeenCalledWith(400);
      expect(res1.json).toHaveBeenCalledWith({ message: "Category name is required" });

      const res2 = createMockRes();
      categoryServiceMock.createCategory.mockRejectedValueOnce(new Error("db down"));
      await controller.createCategory(
        { user: { id: 1, role: "admin" }, body: { category_name: "Ok" } },
        res2
      );
      expect(res2.status).toHaveBeenCalledWith(500);
      expect(res2.json).toHaveBeenCalledWith({ message: "Internal server error" });
      expect(loggerMock.error).toHaveBeenCalled();
    });

    test("updateCategory validates request body and forwards service params", async () => {
      const { controller, categoryServiceMock } = loadCategoryController();
      const res = createMockRes();

      await controller.updateCategory(
        { user: { id: 1, role: "admin" }, params: { id: "9" }, body: "bad" },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(categoryServiceMock.updateCategory).not.toHaveBeenCalled();

      categoryServiceMock.updateCategory.mockResolvedValue({ id: 9, category_name: "New" });
      const res2 = createMockRes();
      await controller.updateCategory(
        {
          user: { id: 1, role: "admin" },
          params: { id: "9" },
          body: { category_name: "New", description: "Desc" },
        },
        res2
      );
      expect(categoryServiceMock.updateCategory).toHaveBeenCalledWith({
        category_id: "9",
        category_name: "New",
        description: "Desc",
      });
      expect(res2.status).toHaveBeenCalledWith(200);
    });

    test("deleteCategory propagates service errors", async () => {
      const { controller, categoryServiceMock } = loadCategoryController();

      categoryServiceMock.deleteCategory.mockRejectedValue(
        Object.assign(new Error("Invalid category id"), { statusCode: 400 })
      );

      const res = createMockRes();
      await controller.deleteCategory(
        { user: { id: 1, role: "admin" }, params: { id: "bad" } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid category id" });
    });

    test("getAllCategories and getCategoryById map unexpected errors to 500", async () => {
      const { controller, categoryServiceMock } = loadCategoryController();

      categoryServiceMock.getAllCategories.mockRejectedValue(new Error("boom"));
      const res1 = createMockRes();
      await controller.getAllCategories({}, res1);
      expect(res1.status).toHaveBeenCalledWith(500);

      categoryServiceMock.getCategoryById.mockRejectedValue(new Error("boom"));
      const res2 = createMockRes();
      await controller.getCategoryById({ params: { id: "1" } }, res2);
      expect(res2.status).toHaveBeenCalledWith(500);
    });
  });
});
