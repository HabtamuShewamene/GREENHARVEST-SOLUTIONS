const request = require("supertest");
const { createHeaderAuthMiddleware } = require("./helpers/mockAuthMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// Cart Service
// ─────────────────────────────────────────────────────────────────────────────
const loadCartService = () => {
  jest.resetModules();

  jest.doMock("../src/models/cartModel", () => ({
    createCartItem: jest.fn(),
    deleteCartItemByIdForUser: jest.fn(),
    findCartItemByUserAndProduct: jest.fn(),
    findCartItemWithStockById: jest.fn(),
    getUserCartItems: jest.fn(),
    updateCartItemQuantityById: jest.fn(),
  }));

  jest.doMock("../src/models/productModel", () => ({
    findProductStockById: jest.fn(),
  }));

  const cartService = require("../src/services/cartService");
  const cartModel = require("../src/models/cartModel");
  const productModel = require("../src/models/productModel");

  return { cartService, cartModel, productModel };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cart route app builder
// ─────────────────────────────────────────────────────────────────────────────
const buildCartApp = (cartServiceMock) => {
  jest.resetModules();
  jest.doMock("../src/services/cartService", () => cartServiceMock);
  jest.doMock("../src/middleware/authMiddleware", () => createHeaderAuthMiddleware());

  const cartRoutes = require("../src/routes/cartRoutes");
  const { createRouteApp } = require("./helpers/createRouteApp");
  return createRouteApp("/api/cart", cartRoutes);
};

// ─────────────────────────────────────────────────────────────────────────────
// Order Service (extended)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Cart Service Tests
// ─────────────────────────────────────────────────────────────────────────────
describe("Cart tests", () => {
  describe("cartService – addToCart validation", () => {
    test("rejects non-integer product_id or quantity", async () => {
      const { cartService } = loadCartService();

      await expect(
        cartService.addToCart({ user_id: 1, product_id: "abc", quantity: 2 })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "product_id and quantity must be positive integers",
      });

      await expect(
        cartService.addToCart({ user_id: 1, product_id: 5, quantity: 0 })
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        cartService.addToCart({ user_id: 1, product_id: 5, quantity: -1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when product is not found", async () => {
      const { cartService, productModel } = loadCartService();

      productModel.findProductStockById.mockResolvedValue(null);

      await expect(
        cartService.addToCart({ user_id: 1, product_id: 999, quantity: 1 })
      ).rejects.toMatchObject({ statusCode: 404, message: "Product not found" });
    });

    test("rejects when requested quantity exceeds stock (new item)", async () => {
      const { cartService, cartModel, productModel } = loadCartService();

      productModel.findProductStockById.mockResolvedValue({ id: 5, stock: 3 });
      cartModel.findCartItemByUserAndProduct.mockResolvedValue(null);

      await expect(
        cartService.addToCart({ user_id: 1, product_id: 5, quantity: 10 })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Requested quantity exceeds available stock",
      });
    });

    test("rejects when accumulated quantity exceeds stock (existing item)", async () => {
      const { cartService, cartModel, productModel } = loadCartService();

      productModel.findProductStockById.mockResolvedValue({ id: 5, stock: 5 });
      cartModel.findCartItemByUserAndProduct.mockResolvedValue({ id: 10, quantity: 4 });

      await expect(
        cartService.addToCart({ user_id: 1, product_id: 5, quantity: 3 })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Requested quantity exceeds available stock",
      });
    });

    test("creates a new cart item when none exists", async () => {
      const { cartService, cartModel, productModel } = loadCartService();

      productModel.findProductStockById.mockResolvedValue({ id: 5, stock: 10 });
      cartModel.findCartItemByUserAndProduct.mockResolvedValue(null);
      cartModel.createCartItem.mockResolvedValue(undefined);
      cartModel.getUserCartItems.mockResolvedValue([{ id: 1, product_id: 5, quantity: 2 }]);

      const result = await cartService.addToCart({ user_id: 1, product_id: 5, quantity: 2 });

      expect(cartModel.createCartItem).toHaveBeenCalledWith({
        user_id: 1,
        product_id: 5,
        quantity: 2,
      });
      expect(result).toHaveLength(1);
    });

    test("updates an existing cart item quantity", async () => {
      const { cartService, cartModel, productModel } = loadCartService();

      productModel.findProductStockById.mockResolvedValue({ id: 5, stock: 10 });
      cartModel.findCartItemByUserAndProduct.mockResolvedValue({ id: 10, quantity: 2 });
      cartModel.updateCartItemQuantityById.mockResolvedValue(undefined);
      cartModel.getUserCartItems.mockResolvedValue([{ id: 10, product_id: 5, quantity: 4 }]);

      await cartService.addToCart({ user_id: 1, product_id: 5, quantity: 2 });

      expect(cartModel.updateCartItemQuantityById).toHaveBeenCalledWith(10, 4);
    });
  });

  describe("cartService – updateCartItem validation", () => {
    test("rejects invalid cart_item_id", async () => {
      const { cartService } = loadCartService();

      await expect(
        cartService.updateCartItem({ user_id: 1, cart_item_id: "bad", quantity: 2 })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid cart item id" });
    });

    test("rejects invalid quantity", async () => {
      const { cartService } = loadCartService();

      await expect(
        cartService.updateCartItem({ user_id: 1, cart_item_id: 5, quantity: 0 })
      ).rejects.toMatchObject({ statusCode: 400, message: "quantity must be a positive integer" });

      await expect(
        cartService.updateCartItem({ user_id: 1, cart_item_id: 5, quantity: -5 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when cart item is not found", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.findCartItemWithStockById.mockResolvedValue(null);

      await expect(
        cartService.updateCartItem({ user_id: 1, cart_item_id: 5, quantity: 2 })
      ).rejects.toMatchObject({ statusCode: 404, message: "Cart item not found" });
    });

    test("rejects when cart item belongs to another user", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.findCartItemWithStockById.mockResolvedValue({
        id: 5,
        user_id: 99,
        stock: 10,
      });

      await expect(
        cartService.updateCartItem({ user_id: 1, cart_item_id: 5, quantity: 2 })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "You can only update your own cart items",
      });
    });

    test("rejects when quantity exceeds stock", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.findCartItemWithStockById.mockResolvedValue({
        id: 5,
        user_id: 1,
        stock: 3,
      });

      await expect(
        cartService.updateCartItem({ user_id: 1, cart_item_id: 5, quantity: 10 })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Requested quantity exceeds available stock",
      });
    });

    test("successfully updates a cart item", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.findCartItemWithStockById.mockResolvedValue({
        id: 5,
        user_id: 1,
        stock: 10,
      });
      cartModel.updateCartItemQuantityById.mockResolvedValue(undefined);
      cartModel.getUserCartItems.mockResolvedValue([{ id: 5, quantity: 3 }]);

      const result = await cartService.updateCartItem({
        user_id: 1,
        cart_item_id: 5,
        quantity: 3,
      });

      expect(cartModel.updateCartItemQuantityById).toHaveBeenCalledWith(5, 3);
      expect(result).toHaveLength(1);
    });
  });

  describe("cartService – removeCartItem validation", () => {
    test("rejects invalid cart_item_id", async () => {
      const { cartService } = loadCartService();

      await expect(
        cartService.removeCartItem({ user_id: 1, cart_item_id: "bad" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid cart item id" });
    });

    test("rejects when cart item is not found or not owned", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.deleteCartItemByIdForUser.mockResolvedValue(null);

      await expect(
        cartService.removeCartItem({ user_id: 1, cart_item_id: 999 })
      ).rejects.toMatchObject({ statusCode: 404, message: "Cart item not found" });
    });

    test("successfully removes a cart item", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.deleteCartItemByIdForUser.mockResolvedValue({ id: 5 });
      cartModel.getUserCartItems.mockResolvedValue([]);

      const result = await cartService.removeCartItem({ user_id: 1, cart_item_id: 5 });

      expect(cartModel.deleteCartItemByIdForUser).toHaveBeenCalledWith(5, 1);
      expect(result).toHaveLength(0);
    });
  });

  describe("cartService – getCart", () => {
    test("delegates directly to cartModel.getUserCartItems", async () => {
      const { cartService, cartModel } = loadCartService();

      cartModel.getUserCartItems.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await cartService.getCart(1);

      expect(cartModel.getUserCartItems).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cart routes
  // ─────────────────────────────────────────────────────────────────────────
  describe("cart routes", () => {
    let cartServiceMock;
    let app;

    beforeEach(() => {
      cartServiceMock = {
        addToCart: jest.fn(),
        getCart: jest.fn(),
        removeCartItem: jest.fn(),
        updateCartItem: jest.fn(),
      };

      app = buildCartApp(cartServiceMock);
    });

    test("GET /api/cart returns the user cart", async () => {
      cartServiceMock.getCart.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const response = await request(app)
        .get("/api/cart")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(200);
      expect(response.body.cart).toHaveLength(2);
    });

    test("GET /api/cart returns 401 for unauthenticated request", async () => {
      const response = await request(app).get("/api/cart");
      expect(response.status).toBe(401);
    });

    test("POST /api/cart adds an item to the cart", async () => {
      cartServiceMock.addToCart.mockResolvedValue([{ id: 1, product_id: 5, quantity: 2 }]);

      const response = await request(app)
        .post("/api/cart")
        .set("x-test-role", "buyer")
        .send({ product_id: 5, quantity: 2 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Cart updated successfully");
      expect(response.body.cart).toHaveLength(1);
    });

    test("POST /api/cart returns 400 when product_id is invalid", async () => {
      cartServiceMock.addToCart.mockRejectedValue(
        Object.assign(
          new Error("product_id and quantity must be positive integers"),
          { statusCode: 400 }
        )
      );

      const response = await request(app)
        .post("/api/cart")
        .set("x-test-role", "buyer")
        .send({ product_id: "abc", quantity: 2 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("product_id and quantity must be positive integers");
    });

    test("POST /api/cart returns 404 when product is not found", async () => {
      cartServiceMock.addToCart.mockRejectedValue(
        Object.assign(new Error("Product not found"), { statusCode: 404 })
      );

      const response = await request(app)
        .post("/api/cart")
        .set("x-test-role", "buyer")
        .send({ product_id: 999, quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Product not found");
    });

    test("POST /api/cart returns 400 when stock is exceeded", async () => {
      cartServiceMock.addToCart.mockRejectedValue(
        Object.assign(
          new Error("Requested quantity exceeds available stock"),
          { statusCode: 400 }
        )
      );

      const response = await request(app)
        .post("/api/cart")
        .set("x-test-role", "buyer")
        .send({ product_id: 5, quantity: 9999 });

      expect(response.status).toBe(400);
    });

    test("PATCH /api/cart/:id updates a cart item", async () => {
      cartServiceMock.updateCartItem.mockResolvedValue([{ id: 3, quantity: 5 }]);

      const response = await request(app)
        .patch("/api/cart/3")
        .set("x-test-role", "buyer")
        .send({ quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Cart item updated successfully");
    });

    test("PATCH /api/cart/:id returns 403 when item belongs to another user", async () => {
      cartServiceMock.updateCartItem.mockRejectedValue(
        Object.assign(
          new Error("You can only update your own cart items"),
          { statusCode: 403 }
        )
      );

      const response = await request(app)
        .patch("/api/cart/99")
        .set("x-test-role", "buyer")
        .send({ quantity: 2 });

      expect(response.status).toBe(403);
    });

    test("PATCH /api/cart/:id returns 400 for invalid quantity", async () => {
      cartServiceMock.updateCartItem.mockRejectedValue(
        Object.assign(new Error("quantity must be a positive integer"), { statusCode: 400 })
      );

      const response = await request(app)
        .patch("/api/cart/3")
        .set("x-test-role", "buyer")
        .send({ quantity: 0 });

      expect(response.status).toBe(400);
    });

    test("DELETE /api/cart/:id removes a cart item", async () => {
      cartServiceMock.removeCartItem.mockResolvedValue([]);

      const response = await request(app)
        .delete("/api/cart/3")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Cart item removed successfully");
    });

    test("DELETE /api/cart/:id returns 404 when cart item is missing", async () => {
      cartServiceMock.removeCartItem.mockRejectedValue(
        Object.assign(new Error("Cart item not found"), { statusCode: 404 })
      );

      const response = await request(app)
        .delete("/api/cart/999")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Cart item not found");
    });

    test("DELETE /api/cart/:id returns 500 for unexpected errors", async () => {
      cartServiceMock.removeCartItem.mockRejectedValue(new Error("db crash"));

      const response = await request(app)
        .delete("/api/cart/3")
        .set("x-test-role", "buyer");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Order Service – extended edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe("Order extended tests", () => {
  describe("orderService – createOrder edge cases", () => {
    test("rejects when cart is empty", async () => {
      const { orderService, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
        if (typeof sql === "string" && sql.includes("FROM carts c")) return { rows: [] };
        return { rows: [] };
      });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Cart is empty",
      });
    });

    test("rejects when address_id is not a valid integer", async () => {
      const { orderService, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
        return { rows: [] };
      });

      await expect(
        orderService.createOrder(3, { address_id: "not-a-number" })
      ).rejects.toMatchObject({ statusCode: 400, message: "address_id must be a valid integer" });
    });

    test("rejects when farmer_id is missing from supply chain", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [{ id: 1, product_id: 10, quantity: 1, name: "Tomato", price: 5, stock: 5 }],
          };
        }
        return { rows: [] };
      });

      orderModel.findProductSupplyChainById.mockResolvedValue({
        product_id: 10,
        farmer_id: null,
        field_agent_id: 7,
      });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("rejects when field_agent_id is missing from supply chain", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [{ id: 1, product_id: 10, quantity: 1, name: "Tomato", price: 5, stock: 5 }],
          };
        }
        return { rows: [] };
      });

      orderModel.findProductSupplyChainById.mockResolvedValue({
        product_id: 10,
        farmer_id: 50,
        field_agent_id: null,
      });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({ statusCode: 400 });
    });

    test("rejects when cart items belong to different farmers", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              { id: 1, product_id: 10, quantity: 1, name: "Tomato", price: 5, stock: 5 },
              { id: 2, product_id: 11, quantity: 1, name: "Potato", price: 3, stock: 5 },
            ],
          };
        }
        return { rows: [] };
      });

      orderModel.findProductSupplyChainById
        .mockResolvedValueOnce({ product_id: 10, farmer_id: 50, field_agent_id: 7 })
        .mockResolvedValueOnce({ product_id: 11, farmer_id: 99, field_agent_id: 7 }); // different farmer

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "All products in an order must belong to the same farmer",
      });
    });

    test("rejects when decrement stock results in negative stock", async () => {
      const { orderService, orderModel, client } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [{ id: 1, product_id: 10, quantity: 2, name: "Tomato", price: 5, stock: 5 }],
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
      orderModel.decrementProductStock.mockResolvedValue({ id: 10, stock: -1 }); // negative!

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "Insufficient stock for product: Tomato",
      });
    });
  });

  describe("orderService – getOrderByIdForBuyer", () => {
    test("rejects invalid order id", async () => {
      const { orderService } = loadOrderService();

      await expect(orderService.getOrderByIdForBuyer(3, "bad")).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid order id",
      });

      await expect(orderService.getOrderByIdForBuyer(3, 0)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    test("rejects when order is not found", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.getOrdersForBuyer.mockResolvedValue([]);

      await expect(orderService.getOrderByIdForBuyer(3, 999)).rejects.toMatchObject({
        statusCode: 404,
        message: "Order not found",
      });
    });

    test("returns the order when found", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.getOrdersForBuyer.mockResolvedValue([{ id: 15, buyer_id: 3 }]);

      const order = await orderService.getOrderByIdForBuyer(3, 15);
      expect(order.id).toBe(15);
    });
  });

  describe("orderService – updateOrderStatus edge cases", () => {
    test("rejects when actor is null", async () => {
      const { orderService } = loadOrderService();

      await expect(
        orderService.updateOrderStatus({ actor: null, order_id: 11, status: "confirmed" })
      ).rejects.toMatchObject({ statusCode: 401, message: "Authentication is required" });
    });

    test("rejects when order_id is invalid", async () => {
      const { orderService } = loadOrderService();

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "field_agent" },
          order_id: "not-a-number",
          status: "confirmed",
        })
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid order id" });
    });

    test("rejects when status is missing", async () => {
      const { orderService } = loadOrderService();

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "field_agent" },
          order_id: 11,
          status: "",
        })
      ).rejects.toMatchObject({ statusCode: 400, message: "status is required" });
    });

    test("rejects when order is not found", async () => {
      const { orderService, orderModel } = loadOrderService();

      orderModel.findOrderById.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus({
          actor: { id: 7, role: "field_agent" },
          order_id: 404,
          status: "confirmed",
        })
      ).rejects.toMatchObject({ statusCode: 404, message: "Order not found" });
    });
  });
});
