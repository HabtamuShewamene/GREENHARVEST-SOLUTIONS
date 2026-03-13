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

const createCategory = async ({ category_name, description }) => {
  if (!isRequired(category_name)) {
    throw createServiceError("Category name is required", 400);
  }

  const normalizedCategoryName = String(category_name).trim();
  const normalizedDescription = normalizeDescription(description);

  const existingCategory = await categoryModel.findCategoryByName(normalizedCategoryName);

  if (existingCategory) {
    throw createServiceError("Category already exists", 409);
  }

  return categoryModel.createCategory({
    category_name: normalizedCategoryName,
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

const updateCategory = async ({ categoryId, category_name, description }) => {
  if (!isPositiveInteger(categoryId)) {
    throw createServiceError("Invalid category id", 400);
  }

  if (!isRequired(category_name)) {
    throw createServiceError("Category name is required", 400);
  }

  const existingCategory = await categoryModel.findCategoryById(Number(categoryId));

  if (!existingCategory) {
    throw createServiceError("Category not found", 404);
  }

  const normalizedCategoryName = String(category_name).trim();
  const normalizedDescription = normalizeDescription(description);

  const duplicateCategory = await categoryModel.findCategoryByName(normalizedCategoryName);

  if (duplicateCategory && Number(duplicateCategory.id) !== Number(categoryId)) {
    throw createServiceError("Category already exists", 409);
  }

  return categoryModel.updateCategoryById(Number(categoryId), {
    category_name: normalizedCategoryName,
    description: normalizedDescription === undefined ? null : normalizedDescription,
  });
};

const deleteCategory = async (categoryId) => {
  if (!isPositiveInteger(categoryId)) {
    throw createServiceError("Invalid category id", 400);
  }

  const existingCategory = await categoryModel.findCategoryById(Number(categoryId));

  if (!existingCategory) {
    throw createServiceError("Category not found", 404);
  }

  return categoryModel.deleteCategoryById(Number(categoryId));
};

module.exports = {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
};