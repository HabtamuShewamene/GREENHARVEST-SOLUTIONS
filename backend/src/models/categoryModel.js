const { pool } = require("../config/db");

const createCategory = async ({ category_name, description = null }) => {
	const result = await pool.query(
		`
			INSERT INTO categories (name, description)
			VALUES ($1, $2)
			RETURNING id, name AS category_name, description
		`,
		[category_name, description]
	);

	return result.rows[0];
};

const findCategoryById = async (categoryId) => {
	const result = await pool.query(
		`
			SELECT
				id,
				name AS category_name,
				description
			FROM categories
			WHERE id = $1
		`,
		[categoryId]
	);

	return result.rows[0] || null;
};

const findCategoryByName = async (category_name) => {
	const result = await pool.query(
		`
			SELECT
				id,
				name AS category_name,
				description
			FROM categories
			WHERE LOWER(name) = LOWER($1)
		`,
		[category_name]
	);

	return result.rows[0] || null;
};

const getAllCategories = async () => {
	const result = await pool.query(
		`
			SELECT
				id,
				name,
				name AS category_name,
				description
			FROM categories
			ORDER BY name ASC
		`
	);

	return result.rows;
};

const updateCategoryById = async (categoryId, { category_name, description = null }) => {
	const result = await pool.query(
		`
			UPDATE categories
			SET
				name = $1,
				description = $2
			WHERE id = $3
			RETURNING id, name AS category_name, description
		`,
		[category_name, description, categoryId]
	);

	return result.rows[0] || null;
};

const deleteCategoryById = async (categoryId) => {
	const result = await pool.query(
		`
			DELETE FROM categories
			WHERE id = $1
			RETURNING id
		`,
		[categoryId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createCategory,
	deleteCategoryById,
	findCategoryById,
	findCategoryByName,
	getAllCategories,
	updateCategoryById,
};
