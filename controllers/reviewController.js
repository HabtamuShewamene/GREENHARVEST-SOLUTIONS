const { pool } = require("../config/db");

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

    const productResult = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const existingReviewResult = await pool.query(
      "SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2",
      [productId, req.user.id]
    );

    if (existingReviewResult.rows.length > 0) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO reviews (product_id, user_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING id, product_id, user_id, rating, comment, created_at
      `,
      [
        productId,
        req.user.id,
        Number(rating),
        comment ? comment.trim() : null,
      ]
    );

    return res.status(201).json({
      message: "Review added successfully",
      review: result.rows[0],
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

    const existingReviewResult = await pool.query(
      "SELECT id, user_id FROM reviews WHERE id = $1",
      [reviewId]
    );

    if (existingReviewResult.rows.length === 0) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const review = existingReviewResult.rows[0];

    if (review.user_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own review",
      });
    }

    const result = await pool.query(
      `
        UPDATE reviews
        SET
          rating = COALESCE($1, rating),
          comment = COALESCE($2, comment)
        WHERE id = $3
        RETURNING id, product_id, user_id, rating, comment, created_at
      `,
      [
        rating !== undefined ? Number(rating) : null,
        comment !== undefined ? (comment ? comment.trim() : null) : null,
        reviewId,
      ]
    );

    return res.status(200).json({
      message: "Review updated successfully",
      review: result.rows[0],
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

    const existingReviewResult = await pool.query(
      "SELECT id, user_id FROM reviews WHERE id = $1",
      [reviewId]
    );

    if (existingReviewResult.rows.length === 0) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const review = existingReviewResult.rows[0];

    if (review.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You are not allowed to delete this review",
      });
    }

    await pool.query("DELETE FROM reviews WHERE id = $1", [reviewId]);

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

    const productResult = await pool.query(
      "SELECT id, name FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const summaryResult = await pool.query(
      `
        SELECT
          COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating,
          COUNT(*)::int AS total_reviews
        FROM reviews
        WHERE product_id = $1
      `,
      [productId]
    );

    const reviewsResult = await pool.query(
      `
        SELECT
          r.id,
          r.product_id,
          r.user_id,
          r.rating,
          r.comment,
          r.created_at,
          u.name AS user_name,
          u.email AS user_email
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
      `,
      [productId]
    );

    return res.status(200).json({
      product: productResult.rows[0],
      average_rating: summaryResult.rows[0].average_rating,
      total_reviews: summaryResult.rows[0].total_reviews,
      reviews: reviewsResult.rows,
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