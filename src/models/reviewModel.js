const { pool } = require("../config/db");

const findReviewByProductAndUser = async (productId, userId) => {
	const result = await pool.query(
		`
			SELECT id, product_id, user_id, rating, comment, created_at
			FROM reviews
			WHERE product_id = $1 AND user_id = $2
		`,
		[productId, userId]
	);

	return result.rows[0] || null;
};

const createReview = async ({ productId, userId, rating, comment }) => {
	const result = await pool.query(
		`
			INSERT INTO reviews (product_id, user_id, rating, comment)
			VALUES ($1, $2, $3, $4)
			RETURNING id, product_id, user_id, rating, comment, created_at
		`,
		[productId, userId, rating, comment]
	);

	return result.rows[0];
};

const findReviewById = async (reviewId) => {
	const result = await pool.query(
		`
			SELECT id, product_id, user_id, rating, comment, created_at
			FROM reviews
			WHERE id = $1
		`,
		[reviewId]
	);

	return result.rows[0] || null;
};

const updateReviewById = async (reviewId, { rating, comment }) => {
	const result = await pool.query(
		`
			UPDATE reviews
			SET
				rating = COALESCE($1, rating),
				comment = COALESCE($2, comment)
			WHERE id = $3
			RETURNING id, product_id, user_id, rating, comment, created_at
		`,
		[rating, comment, reviewId]
	);

	return result.rows[0] || null;
};

const deleteReviewById = async (reviewId) => {
	const result = await pool.query(
		`
			DELETE FROM reviews
			WHERE id = $1
			RETURNING id
		`,
		[reviewId]
	);

	return result.rows[0] || null;
};

const getProductReviewSummary = async (productId) => {
	const result = await pool.query(
		`
			SELECT
				COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating,
				COUNT(*)::int AS total_reviews
			FROM reviews
			WHERE product_id = $1
		`,
		[productId]
	);

	return result.rows[0];
};

const getProductReviews = async (productId) => {
	const result = await pool.query(
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

	return result.rows;
};

module.exports = {
	createReview,
	deleteReviewById,
	findReviewById,
	findReviewByProductAndUser,
	getProductReviews,
	getProductReviewSummary,
	updateReviewById,
};
