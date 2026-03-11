const { pool } = require("../config/db");

const findCategoryById = async (categoryId) => {
	const result = await pool.query(
		`
			SELECT id, name, description, created_at
			FROM categories
			WHERE id = $1
		`,
		[categoryId]
	);

	return result.rows[0] || null;
};

const getAllCategories = async () => {
	const result = await pool.query(
		`
			SELECT id, name, description, created_at
			FROM categories
			ORDER BY name ASC
		`
	);

	return result.rows;
};

module.exports = {
	findCategoryById,
	getAllCategories,
};
