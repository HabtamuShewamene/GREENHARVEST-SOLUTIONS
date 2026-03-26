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

  jest.doMock("../src/utils/logger", () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }));

  const orderService = require("../src/services/orderService");
  const orderModel = require("../src/models/orderModel");

  return { client, orderModel, orderService };
};

describe("Order API additional coverage", () => {
  describe("orderService createOrder", () => {
    test("rejects when cart items belong to different field agents", async () => {
      const { client, orderModel, orderService } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              { id: 1, product_id: 10, quantity: 1, name: "Tomato", price: 5, stock: 5 },
              { id: 2, product_id: 11, quantity: 1, name: "Potato", price: 6, stock: 5 },
            ],
          };
        }

        return { rows: [] };
      });

      orderModel.findProductSupplyChainById
        .mockResolvedValueOnce({ product_id: 10, farmer_id: 50, field_agent_id: 7 })
        .mockResolvedValueOnce({ product_id: 11, farmer_id: 50, field_agent_id: 8 });

      await expect(orderService.createOrder(3, {})).rejects.toMatchObject({
        statusCode: 400,
        message: "All products in an order must belong to the same field agent",
      });
    });

    test("calculates totals, reduces inventory, and clears the cart on success", async () => {
      const { client, orderModel, orderService } = loadOrderService();

      client.query.mockImplementation(async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT") {
          return { rows: [] };
        }

        if (typeof sql === "string" && sql.includes("FROM carts c")) {
          return {
            rows: [
              { id: 1, product_id: 10, quantity: 2, name: "Tomato", price: 5, stock: 5 },
              { id: 2, product_id: 11, quantity: 1, name: "Potato", price: 7, stock: 3 },
            ],
          };
        }

        if (typeof sql === "string" && sql.includes("DELETE FROM cart_items")) {
          return { rowCount: 2, rows: [] };
        }

        return { rows: [] };
      });

      orderModel.findProductSupplyChainById
        .mockResolvedValueOnce({ product_id: 10, farmer_id: 50, field_agent_id: 7 })
        .mockResolvedValueOnce({ product_id: 11, farmer_id: 50, field_agent_id: 7 });
      orderModel.createOrderRecord.mockResolvedValue({ id: 15 });
      orderModel.createOrderItemRecord.mockResolvedValue({});
      orderModel.decrementProductStock
        .mockResolvedValueOnce({ id: 10, stock: 3 })
        .mockResolvedValueOnce({ id: 11, stock: 2 });
      orderModel.getOrdersForBuyer.mockResolvedValue([
        {
          id: 15,
          buyer_id: 3,
          farmer_id: 50,
          field_agent_id: 7,
          total_amount: "17.00",
        },
      ]);

      const order = await orderService.createOrder(3, { address_id: 12 });

      expect(orderModel.createOrderRecord).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          buyer_id: 3,
          farmer_id: 50,
          field_agent_id: 7,
          total_amount: "17.00",
          address_id: 12,
        })
      );
      expect(orderModel.decrementProductStock).toHaveBeenCalledTimes(2);
      expect(orderModel.decrementProductStock).toHaveBeenNthCalledWith(1, client, 10, 2);
      expect(orderModel.decrementProductStock).toHaveBeenNthCalledWith(2, client, 11, 1);
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM cart_items"),
        [3]
      );
      expect(order.total_amount).toBe("17.00");
    });
  });
});
