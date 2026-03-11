const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");

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

    const product = await productModel.findProductStockById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const existingItem = await cartModel.findCartItemByUserAndProduct(req.user.id, productId);

    if (existingItem) {
      const updatedQuantity = existingItem.quantity + requestedQuantity;

      if (updatedQuantity > product.stock) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      await cartModel.updateCartItemQuantityById(existingItem.id, updatedQuantity);
    } else {
      if (requestedQuantity > product.stock) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      await cartModel.createCartItem({
        userId: req.user.id,
        productId,
        quantity: requestedQuantity,
      });
    }

    const cartItems = await cartModel.getUserCartItems(req.user.id);

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

    const cartItem = await cartModel.findCartItemWithStockById(cartItemId);

    if (!cartItem) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

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

    await cartModel.updateCartItemQuantityById(cartItemId, Number(quantity));

    const cartItems = await cartModel.getUserCartItems(req.user.id);

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

    const deletedCartItem = await cartModel.deleteCartItemByIdForUser(cartItemId, req.user.id);

    if (!deletedCartItem) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    const cartItems = await cartModel.getUserCartItems(req.user.id);

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
    const cartItems = await cartModel.getUserCartItems(req.user.id);

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
