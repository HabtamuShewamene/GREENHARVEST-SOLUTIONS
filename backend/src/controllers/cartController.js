const logger = require("../utils/logger");
const cartService = require("../services/cartService");

const handleControllerError = (res, context, error, meta = {}) => {
  logger.error(context, {
    message: error.message,
    code: error.code,
    stack: error.stack,
    ...meta,
  });

  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Internal server error",
  });
};

const addToCart = async (req, res) => {
  try {
    const cartItems = await cartService.addToCart({
      user_id: req.user.id,
      product_id: req.body && (req.body.product_id || req.body.productId),
      quantity: req.body && req.body.quantity,
    });

    return res.status(200).json({
      message: "Cart updated successfully",
      cart: cartItems,
    });
  } catch (error) {
    return handleControllerError(res, "Add to cart failed", error, {
      userId: req.user && req.user.id,
      body: req.body,
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const cartItems = await cartService.updateCartItem({
      user_id: req.user.id,
      cart_item_id: req.params.id,
      quantity: req.body && req.body.quantity,
    });

    return res.status(200).json({
      message: "Cart item updated successfully",
      cart: cartItems,
    });
  } catch (error) {
    return handleControllerError(res, "Update cart item failed", error, {
      userId: req.user && req.user.id,
      body: req.body,
      cartItemId: req.params.id,
    });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const cartItems = await cartService.removeCartItem({
      user_id: req.user.id,
      cart_item_id: req.params.id,
    });

    return res.status(200).json({
      message: "Cart item removed successfully",
      cart: cartItems,
    });
  } catch (error) {
    return handleControllerError(res, "Remove cart item failed", error, {
      userId: req.user && req.user.id,
      cartItemId: req.params.id,
    });
  }
};

const getCart = async (req, res) => {
  try {
    const cartItems = await cartService.getCart(req.user.id);

    return res.status(200).json({
      cart: cartItems,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch cart failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const cartItems = await cartService.clearCart(req.user.id);

    return res.status(200).json({
      message: "Cart cleared successfully",
      cart: cartItems,
    });
  } catch (error) {
    return handleControllerError(res, "Clear cart failed", error, {
      userId: req.user && req.user.id,
    });
  }
};

module.exports = {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
  clearCart,
};
