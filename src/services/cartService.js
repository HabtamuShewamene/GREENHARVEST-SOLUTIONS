const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const { isPositiveInteger } = require("../utils/validators");

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getCart = async (user_id) => {
  return cartModel.getUserCartItems(user_id);
};

const addToCart = async ({ user_id, product_id, quantity }) => {
  if (!isPositiveInteger(product_id) || !isPositiveInteger(quantity)) {
    throw createServiceError("product_id and quantity must be positive integers", 400);
  }

  const product = await productModel.findProductStockById(Number(product_id));

  if (!product) {
    throw createServiceError("Product not found", 404);
  }

  const existingItem = await cartModel.findCartItemByUserAndProduct(user_id, Number(product_id));

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
      user_id,
      product_id: Number(product_id),
      quantity: Number(quantity),
    });
  }

  return cartModel.getUserCartItems(user_id);
};

const updateCartItem = async ({ user_id, cart_item_id, quantity }) => {
  if (!isPositiveInteger(cart_item_id)) {
    throw createServiceError("Invalid cart item id", 400);
  }

  if (!isPositiveInteger(quantity)) {
    throw createServiceError("quantity must be a positive integer", 400);
  }

  const cartItem = await cartModel.findCartItemWithStockById(Number(cart_item_id));

  if (!cartItem) {
    throw createServiceError("Cart item not found", 404);
  }

  if (Number(cartItem.user_id) !== Number(user_id)) {
    throw createServiceError("You can only update your own cart items", 403);
  }

  if (Number(quantity) > Number(cartItem.stock)) {
    throw createServiceError("Requested quantity exceeds available stock", 400);
  }

  await cartModel.updateCartItemQuantityById(Number(cart_item_id), Number(quantity));
  return cartModel.getUserCartItems(user_id);
};

const removeCartItem = async ({ user_id, cart_item_id }) => {
  if (!isPositiveInteger(cart_item_id)) {
    throw createServiceError("Invalid cart item id", 400);
  }

  const deletedCartItem = await cartModel.deleteCartItemByIdForUser(Number(cart_item_id), user_id);

  if (!deletedCartItem) {
    throw createServiceError("Cart item not found", 404);
  }

  return cartModel.getUserCartItems(user_id);
};

module.exports = {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
};
