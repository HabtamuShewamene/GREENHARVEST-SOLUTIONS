const { pool } = require("../config/db");

const getUserCartItems = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        c.id,
        c.user_id,
        c.product_id,
        c.quantity,
        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.stock AS product_stock,
        p.image_url,
        p.farm_location,
        p.farmer_id,
        u.name AS farmer_name
      FROM cart c
      JOIN products p ON p.id = c.product_id
      JOIN users u ON u.id = p.farmer_id
      WHERE c.user_id = $1
      ORDER BY c.id DESC
    `,
    [userId]
  );

  return result.rows;
};

const validatePositiveInteger = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0;
};

const addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!Number.isInteger(Number(product_id)) || !validatePositiveInteger(quantity)) {
      return res.status(400).json({
        message: "product_id and quantity must be positive integers",
      });
    }

    const productId = Number(product_id);
    const requestedQuantity = Number(quantity);

    const productResult = await pool.query(
      `
        SELECT id, stock
        FROM products
        WHERE id = $1
      `,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const product = productResult.rows[0];

    const existingCartItemResult = await pool.query(
      `
        SELECT id, quantity
        FROM cart
        WHERE user_id = $1 AND product_id = $2
      `,
      [req.user.id, productId]
    );

    if (existingCartItemResult.rows.length > 0) {
      const existingItem = existingCartItemResult.rows[0];
      const updatedQuantity = existingItem.quantity + requestedQuantity;

      if (updatedQuantity > product.stock) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      await pool.query(
        `
          UPDATE cart
          SET quantity = $1
          WHERE id = $2
        `,
        [updatedQuantity, existingItem.id]
      );
    } else {
      if (requestedQuantity > product.stock) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      await pool.query(
        `
          INSERT INTO cart (user_id, product_id, quantity)
          VALUES ($1, $2, $3)
        `,
        [req.user.id, productId, requestedQuantity]
      );
    }

    const cartItems = await getUserCartItems(req.user.id);

    return res.status(200).json({
      message: "Cart updated successfully",
      cart: cartItems,
    });
  } catch (error) {
    console.error("Add to cart failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const cartItemId = Number(req.params.id);
    const { quantity } = req.body;

    if (!Number.isInteger(cartItemId)) {
      return res.status(400).json({
        message: "Invalid cart item id",
      });
    }

    if (!validatePositiveInteger(quantity)) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    const cartItemResult = await pool.query(
      `
        SELECT c.id, c.user_id, c.product_id, p.stock
        FROM cart c
        JOIN products p ON p.id = c.product_id
        WHERE c.id = $1
      `,
      [cartItemId]
    );

    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    const cartItem = cartItemResult.rows[0];

    if (cartItem.user_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own cart items",
      });
    }

    if (Number(quantity) > cartItem.stock) {
      return res.status(400).json({
        message: "Requested quantity exceeds available stock",
      });
    }

    await pool.query(
      `
        UPDATE cart
        SET quantity = $1
        WHERE id = $2
      `,
      [Number(quantity), cartItemId]
    );

    const cartItems = await getUserCartItems(req.user.id);

    return res.status(200).json({
      message: "Cart item updated successfully",
      cart: cartItems,
    });
  } catch (error) {
    console.error("Update cart item failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const cartItemId = Number(req.params.id);

    if (!Number.isInteger(cartItemId)) {
      return res.status(400).json({
        message: "Invalid cart item id",
      });
    }

    const result = await pool.query(
      `
        DELETE FROM cart
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
      [cartItemId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    const cartItems = await getUserCartItems(req.user.id);

    return res.status(200).json({
      message: "Cart item removed successfully",
      cart: cartItems,
    });
  } catch (error) {
    console.error("Remove cart item failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getCart = async (req, res) => {
  try {
    const cartItems = await getUserCartItems(req.user.id);

    return res.status(200).json({
      cart: cartItems,
    });
  } catch (error) {
    console.error("Fetch cart failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
};