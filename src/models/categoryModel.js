const { pool } = require("../config/db");

let categorySchema = null;

const getCategorySchema = async () => {
	if (categorySchema) {
		return categorySchema;
	}

	const result = await pool.query(
		`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_name = 'categories'
		`
	);

	const columnNames = result.rows.map((row) => row.column_name);

	const usesLegacySchema =
		columnNames.includes("category_id") && columnNames.includes("category_name");

	categorySchema = usesLegacySchema
		? {
				idColumn: "category_id",
				nameColumn: "category_name",
				hasDescription: false,
		  }
		: {
				idColumn: "id",
				nameColumn: "category_name",
				hasDescription: columnNames.includes("description"),
		  };

	return categorySchema;
};

const createCategory = async ({ category_name, description = null }) => {
	const schema = await getCategorySchema();

	if (schema.hasDescription) {
		const result = await pool.query(
			`
				INSERT INTO categories (category_name, description)
				VALUES ($1, $2)
				RETURNING id, category_name, description
			`,
			[category_name, description]
		);

		return result.rows[0];
	}

	const result = await pool.query(
		`
			INSERT INTO categories (category_name)
			VALUES ($1)
			RETURNING category_id AS id, category_name, NULL::text AS description
		`,
		[category_name]
	);

	return result.rows[0];
};

const findCategoryById = async (categoryId) => {
	const schema = await getCategorySchema();

	const descriptionSelect = schema.hasDescription ? "description" : "NULL::text AS description";

	const result = await pool.query(
		`
			SELECT
				${schema.idColumn} AS id,
				${schema.nameColumn} AS category_name,
				${descriptionSelect}
			FROM categories
			WHERE ${schema.idColumn} = $1
		`,
		[categoryId]
	);

	return result.rows[0] || null;
};

const findCategoryByName = async (category_name) => {
	const schema = await getCategorySchema();
	const descriptionSelect = schema.hasDescription ? "description" : "NULL::text AS description";

	const result = await pool.query(
		`
			SELECT
				${schema.idColumn} AS id,
				${schema.nameColumn} AS category_name,
				${descriptionSelect}
			FROM categories
			WHERE LOWER(${schema.nameColumn}) = LOWER($1)
		`,
		[category_name]
	);

	return result.rows[0] || null;
};

const getAllCategories = async () => {
	const schema = await getCategorySchema();
	const descriptionSelect = schema.hasDescription ? "description" : "NULL::text AS description";

	const result = await pool.query(
		`
			SELECT
				${schema.idColumn} AS id,
				${schema.nameColumn} AS category_name,
				${descriptionSelect}
			FROM categories
			ORDER BY ${schema.nameColumn} ASC
		`
	);

	return result.rows;
};

const updateCategoryById = async (categoryId, { category_name, description = null }) => {
	const schema = await getCategorySchema();

	if (schema.hasDescription) {
		const result = await pool.query(
			`
				UPDATE categories
				SET
					category_name = $1,
					description = $2
				WHERE id = $3
				RETURNING id, category_name, description
			`,
			[category_name, description, categoryId]
		);

		return result.rows[0] || null;
	}

	const result = await pool.query(
		`
			UPDATE categories
			SET category_name = $1
			WHERE category_id = $2
			RETURNING category_id AS id, category_name, NULL::text AS description
		`,
		[category_name, categoryId]
	);

	return result.rows[0] || null;
};

const deleteCategoryById = async (categoryId) => {
	const schema = await getCategorySchema();

	const result = await pool.query(
		`
			DELETE FROM categories
			WHERE ${schema.idColumn} = $1
			RETURNING ${schema.idColumn} AS id
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
