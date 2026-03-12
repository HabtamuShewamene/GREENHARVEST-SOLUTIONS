const productModel = require("../models/productModel");
const reviewModel = require("../models/reviewModel");

const isValidRating = (rating) => {
  return Number.isInteger(Number(rating)) && Number(rating) >= 1 && Number(rating) <= 5;
};

const addReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const productId = Number(product_id);

    if (!Number.isInteger(productId) || !isValidRating(rating)) {
      return res.status(400).json({
        message: "Valid product_id and rating between 1 and 5 are required",
      });
    }

    const product = await productModel.findProductById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const existingReview = await reviewModel.findReviewByProductAndUser(productId, req.user.id);

    if (existingReview) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    const review = await reviewModel.createReview({
      productId,
      userId: req.user.id,
      rating: Number(rating),
      comment: comment ? comment.trim() : null,
    });

    return res.status(201).json({
      message: "Review added successfully",
      review,
    });
  } catch (error) {
    console.error("Add review failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const { rating, comment } = req.body;

    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({
        message: "Invalid review id",
      });
    }

    if (rating === undefined && comment === undefined) {
      return res.status(400).json({
        message: "At least one of rating or comment is required",
      });
    }

    if (rating !== undefined && !isValidRating(rating)) {
      return res.status(400).json({
        message: "rating must be an integer between 1 and 5",
      });
    }

    const review = await reviewModel.findReviewById(reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (review.user_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own review",
      });
    }

    const updatedReview = await reviewModel.updateReviewById(reviewId, {
      rating: rating !== undefined ? Number(rating) : null,
      comment: comment !== undefined ? (comment ? comment.trim() : null) : null,
    });

    return res.status(200).json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Update review failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = Number(req.params.id);

    if (!Number.isInteger(reviewId)) {
      return res.status(400).json({
        message: "Invalid review id",
      });
    }

    const review = await reviewModel.findReviewById(reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (review.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You are not allowed to delete this review",
      });
    }

    await reviewModel.deleteReviewById(reviewId);

    return res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const productId = Number(req.params.product_id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const product = await productModel.findProductById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const summary = await reviewModel.getProductReviewSummary(productId);
    const reviews = await reviewModel.getProductReviews(productId);

    return res.status(200).json({
      product: {
        id: product.id,
        name: product.name,
      },
      average_rating: summary.average_rating,
      total_reviews: summary.total_reviews,
      reviews,
    });
  } catch (error) {
    console.error("Fetch product reviews failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
};
