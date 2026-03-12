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
				nameColumn: "name",
				hasDescription: columnNames.includes("description"),
		  };

	return categorySchema;
};

const createCategory = async ({ name, description = null }) => {
	const schema = await getCategorySchema();

	if (schema.hasDescription) {
		const result = await pool.query(
			`
				INSERT INTO categories (name, description)
				VALUES ($1, $2)
				RETURNING id, name, description
			`,
			[name, description]
		);

		return result.rows[0];
	}

	const result = await pool.query(
		`
			INSERT INTO categories (category_name)
			VALUES ($1)
			RETURNING category_id AS id, category_name AS name, NULL::text AS description
		`,
		[name]
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
				${schema.nameColumn} AS name,
				${descriptionSelect}
			FROM categories
			WHERE ${schema.idColumn} = $1
		`,
		[categoryId]
	);

	return result.rows[0] || null;
};

const findCategoryByName = async (name) => {
	const schema = await getCategorySchema();
	const descriptionSelect = schema.hasDescription ? "description" : "NULL::text AS description";

	const result = await pool.query(
		`
			SELECT
				${schema.idColumn} AS id,
				${schema.nameColumn} AS name,
				${descriptionSelect}
			FROM categories
			WHERE LOWER(${schema.nameColumn}) = LOWER($1)
		`,
		[name]
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
				${schema.nameColumn} AS name,
				${descriptionSelect}
			FROM categories
			ORDER BY ${schema.nameColumn} ASC
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
