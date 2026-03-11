const { pool } = require("../config/db");

const createCategory = async ({ name, description = null }) => {
	const result = await pool.query(
		`
			INSERT INTO categories (name, description)
			VALUES ($1, $2)
			RETURNING id, name, description
		`,
		[name, description]
	);

	return result.rows[0];
};

const findCategoryById = async (categoryId) => {
	const result = await pool.query(
		`
			SELECT id, name, description
			FROM categories
			WHERE id = $1
		`,
		[categoryId]
	);

	return result.rows[0] || null;
};

const findCategoryByName = async (name) => {
	const result = await pool.query(
		`
			SELECT id, name, description
			FROM categories
			WHERE LOWER(name) = LOWER($1)
		`,
		[name]
	);

	return result.rows[0] || null;
};

const getAllCategories = async () => {
	const result = await pool.query(
		`
			SELECT id, name, description
			FROM categories
			ORDER BY name ASC
		`
	);

	return result.rows;
};

module.exports = {
	createCategory,
	findCategoryById,
	findCategoryByName,
	getAllCategories,
};
