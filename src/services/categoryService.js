const categoryModel = require("../models/categoryModel");
const { isPositiveInteger, isRequired } = require("../utils/validators");

const createServiceError = (message, statusCode, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

const normalizeDescription = (description) => {
  if (description === undefined) {
    return undefined;
  }

  if (description === null || description === "") {
    return null;
  }

  return String(description).trim();
};

const createCategory = async ({ name, description }) => {
  if (!isRequired(name)) {
    throw createServiceError("Category name is required", 400);
  }

  const normalizedName = String(name).trim();
  const normalizedDescription = normalizeDescription(description);

  const existingCategory = await categoryModel.findCategoryByName(normalizedName);

  if (existingCategory) {
    throw createServiceError("Category already exists", 409);
  }

  return categoryModel.createCategory({
    name: normalizedName,
    description: normalizedDescription === undefined ? null : normalizedDescription,
  });
};

const getAllCategories = async () => {
  return categoryModel.getAllCategories();
};

const getCategoryById = async (categoryId) => {
  if (!isPositiveInteger(categoryId)) {
    throw createServiceError("Invalid category id", 400);
  }

  const category = await categoryModel.findCategoryById(Number(categoryId));

  if (!category) {
    throw createServiceError("Category not found", 404);
  }

  return category;
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
};