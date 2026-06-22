const logger = require("../utils/logger");
const reviewService = require("../services/reviewService");

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

const addReview = async (req, res) => {
  try {
    const review = await reviewService.addReview({
      user: req.user,
      payload: req.body || {},
    });

    return res.status(201).json({
      message: "Review added successfully",
      review,
    });
  } catch (error) {
    return handleControllerError(res, "Add review failed", error, {
      userId: req.user && req.user.id,
      body: req.body,
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const updatedReview = await reviewService.updateReview({
      user: req.user,
      review_id: req.params.id,
      payload: req.body || {},
    });

    return res.status(200).json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    return handleControllerError(res, "Update review failed", error, {
      userId: req.user && req.user.id,
      reviewId: req.params.id,
      body: req.body,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    await reviewService.deleteReview({
      user: req.user,
      review_id: req.params.id,
    });

    return res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    return handleControllerError(res, "Delete review failed", error, {
      userId: req.user && req.user.id,
      reviewId: req.params.id,
    });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const response = await reviewService.getProductReviews(req.params.product_id);

    return res.status(200).json({
      ...response,
    });
  } catch (error) {
    return handleControllerError(res, "Fetch product reviews failed", error, {
      productId: req.params.product_id,
    });
  }
};

module.exports = {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
};
