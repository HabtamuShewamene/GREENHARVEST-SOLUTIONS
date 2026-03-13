const productModel = require("../models/productModel");
const reviewModel = require("../models/reviewModel");
const { normalizeRole } = require("../utils/roles");
const { isPositiveInteger, isWithinRange } = require("../utils/validators");

const createServiceError = (message, statusCode, extra = {}) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	Object.assign(error, extra);
	return error;
};

const validateRating = (rating) => {
	if (!Number.isInteger(Number(rating)) || !isWithinRange(Number(rating), 1, 5)) {
		throw createServiceError("rating must be an integer between 1 and 5", 400);
	}

	return Number(rating);
};

const ensureProductExists = async (productId) => {
	const product = await productModel.findProductById(productId);

	if (!product) {
		throw createServiceError("Product not found", 404);
	}

	return product;
};

const addReview = async ({ user, payload }) => {
	if (!isPositiveInteger(payload.product_id)) {
		throw createServiceError("Valid product_id is required", 400);
	}

	const productId = Number(payload.product_id);
	const rating = validateRating(payload.rating);
	await ensureProductExists(productId);

	const existingReview = await reviewModel.findReviewByProductAndUser(productId, user.id);

	if (existingReview) {
		throw createServiceError("You have already reviewed this product", 409);
	}

	return reviewModel.createReview({
		productId,
		userId: user.id,
		rating,
		comment: payload.comment ? String(payload.comment).trim() : null,
	});
};

const updateReview = async ({ user, reviewId, payload }) => {
	if (!isPositiveInteger(reviewId)) {
		throw createServiceError("Invalid review id", 400);
	}

	if (payload.rating === undefined && payload.comment === undefined) {
		throw createServiceError("At least one of rating or comment is required", 400);
	}

	const review = await reviewModel.findReviewById(Number(reviewId));

	if (!review) {
		throw createServiceError("Review not found", 404);
	}

	if (Number(review.user_id) !== Number(user.id)) {
		throw createServiceError("You can only update your own review", 403);
	}

	return reviewModel.updateReviewById(Number(reviewId), {
		rating: payload.rating !== undefined ? validateRating(payload.rating) : null,
		comment:
			payload.comment !== undefined
				? payload.comment
					? String(payload.comment).trim()
					: null
				: null,
	});
};

const deleteReview = async ({ user, reviewId }) => {
	if (!isPositiveInteger(reviewId)) {
		throw createServiceError("Invalid review id", 400);
	}

	const review = await reviewModel.findReviewById(Number(reviewId));

	if (!review) {
		throw createServiceError("Review not found", 404);
	}

	const actorRole = normalizeRole(user.role);

	if (Number(review.user_id) !== Number(user.id) && actorRole !== "admin") {
		throw createServiceError("You are not allowed to delete this review", 403);
	}

	await reviewModel.deleteReviewById(Number(reviewId));
	return { deleted: true };
};

const getProductReviews = async (productId) => {
	if (!isPositiveInteger(productId)) {
		throw createServiceError("Invalid product id", 400);
	}

	const parsedProductId = Number(productId);
	const product = await ensureProductExists(parsedProductId);
	const summary = await reviewModel.getProductReviewSummary(parsedProductId);
	const reviews = await reviewModel.getProductReviews(parsedProductId);

	return {
		product: {
			id: product.id,
			name: product.name,
		},
		average_rating: summary.average_rating,
		total_reviews: summary.total_reviews,
		reviews,
	};
};

module.exports = {
	addReview,
	deleteReview,
	getProductReviews,
	updateReview,
};