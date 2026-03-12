const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const { isPositiveInteger } = require("../utils/validators");

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getCart = async (userId) => {
  return cartModel.getUserCartItems(userId);
};

const addToCart = async ({ userId, productId, quantity }) => {
  if (!isPositiveInteger(productId) || !isPositiveInteger(quantity)) {
    throw createServiceError("product_id and quantity must be positive integers", 400);
  }

  const product = await productModel.findProductStockById(Number(productId));

  if (!product) {
    throw createServiceError("Product not found", 404);
  }

  const existingItem = await cartModel.findCartItemByUserAndProduct(userId, Number(productId));

  if (existingItem) {
    const updatedQuantity = Number(existingItem.quantity) + Number(quantity);

    if (updatedQuantity > Number(product.stock)) {
      throw createServiceError("Requested quantity exceeds available stock", 400);
    }

    await cartModel.updateCartItemQuantityById(existingItem.id, updatedQuantity);
  } else {
    if (Number(quantity) > Number(product.stock)) {
      throw createServiceError("Requested quantity exceeds available stock", 400);
    }

    await cartModel.createCartItem({
      userId,
      productId: Number(productId),
      quantity: Number(quantity),
    });
  }

  return cartModel.getUserCartItems(userId);
};

const updateCartItem = async ({ userId, cartItemId, quantity }) => {
  if (!isPositiveInteger(cartItemId)) {
    throw createServiceError("Invalid cart item id", 400);
  }

  if (!isPositiveInteger(quantity)) {
    throw createServiceError("quantity must be a positive integer", 400);
  }

  const cartItem = await cartModel.findCartItemWithStockById(Number(cartItemId));

  if (!cartItem) {
    throw createServiceError("Cart item not found", 404);
  }

  if (Number(cartItem.user_id) !== Number(userId)) {
    throw createServiceError("You can only update your own cart items", 403);
  }

  if (Number(quantity) > Number(cartItem.stock)) {
    throw createServiceError("Requested quantity exceeds available stock", 400);
  }

  await cartModel.updateCartItemQuantityById(Number(cartItemId), Number(quantity));
  return cartModel.getUserCartItems(userId);
};

const removeCartItem = async ({ userId, cartItemId }) => {
  if (!isPositiveInteger(cartItemId)) {
    throw createServiceError("Invalid cart item id", 400);
  }

  const deletedCartItem = await cartModel.deleteCartItemByIdForUser(Number(cartItemId), userId);

  if (!deletedCartItem) {
    throw createServiceError("Cart item not found", 404);
  }

  return cartModel.getUserCartItems(userId);
};

module.exports = {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
};
