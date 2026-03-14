const { pool } = require("../config/db");

const findReviewByProductAndUser = async (product_id, user_id) => {
	const result = await pool.query(
		`
			SELECT review_id AS id, product_id, buyer_id AS user_id, rating, comment, created_at
			FROM reviews
			WHERE product_id = $1 AND buyer_id = $2
		`,
		[product_id, user_id]
	);

	return result.rows[0] || null;
};

const createReview = async ({ product_id, user_id, rating, comment }) => {
	const result = await pool.query(
		`
			INSERT INTO reviews (product_id, buyer_id, rating, comment)
			VALUES ($1, $2, $3, $4)
			RETURNING review_id AS id, product_id, buyer_id AS user_id, rating, comment, created_at
		`,
		[product_id, user_id, rating, comment]
	);

	return result.rows[0];
};

const findReviewById = async (review_id) => {
	const result = await pool.query(
		`
			SELECT review_id AS id, product_id, buyer_id AS user_id, rating, comment, created_at
			FROM reviews
			WHERE review_id = $1
		`,
		[review_id]
	);

	return result.rows[0] || null;
};

const updateReviewById = async (review_id, { rating, comment }) => {
	const result = await pool.query(
		`
			UPDATE reviews
			SET
				rating = COALESCE($1, rating),
				comment = COALESCE($2, comment)
			WHERE review_id = $3
			RETURNING review_id AS id, product_id, buyer_id AS user_id, rating, comment, created_at
		`,
		[rating, comment, review_id]
	);

	return result.rows[0] || null;
};

const deleteReviewById = async (review_id) => {
	const result = await pool.query(
		`
			DELETE FROM reviews
			WHERE review_id = $1
			RETURNING review_id AS id
		`,
		[review_id]
	);

	return result.rows[0] || null;
};

const getProductReviewSummary = async (product_id) => {
	const result = await pool.query(
		`
			SELECT
				COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating,
				COUNT(*)::int AS total_reviews
			FROM reviews
			WHERE product_id = $1
		`,
		[product_id]
	);

	return result.rows[0];
};

const getProductReviews = async (product_id) => {
	const result = await pool.query(
		`
			SELECT
				r.id,
				r.product_id,
				r.buyer_id AS user_id,
				r.rating,
				r.comment,
				r.created_at,
				u.name AS user_name,
				u.email AS user_email
			FROM reviews r
			JOIN users u ON u.user_id = r.buyer_id
			WHERE r.product_id = $1
			ORDER BY r.created_at DESC
		`,
		[product_id]
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
