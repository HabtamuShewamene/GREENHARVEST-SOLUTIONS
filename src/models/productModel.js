const { pool } = require("../config/db");

const productSelect = `
	SELECT
		p.id,
		p.name,
		p.description,
		p.price,
		p.stock,
		p.farm_location,
		p.image_url,
		p.created_at,
		p.category_id,
		p.farmer_id,
		u.name AS farmer_name,
		u.email AS farmer_email,
		c.name AS category_name
	FROM products p
	JOIN users u ON u.id = p.farmer_id
	LEFT JOIN categories c ON c.id = p.category_id
`;

const createProduct = async ({
	farmer_id,
	category_id,
	name,
	description,
	price,
	farm_location,
	image_url,
}) => {
	const result = await pool.query(
		`
			INSERT INTO products (
				farmer_id,
				category_id,
				name,
				description,
				price,
				farm_location,
				image_url
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
		`,
		[farmer_id, category_id, name, description, price, farm_location, image_url]
	);

	if (image_url) {
		const hasImagesTable = await tableExists('product_images');
		if (hasImagesTable) {
			await pool.query(
				`INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`,
				[result.rows[0].id, image_url]
			);
		}
	}

	return result.rows[0];
};

const tableExists = async (tableName) => {
	const result = await pool.query(
		`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = CURRENT_SCHEMA()
					AND table_name = $1
			) AS exists
		`,
		[tableName]
	);

	return Boolean(result.rows[0] && result.rows[0].exists);
};

const getTableColumns = async (tableName) => {
	const result = await pool.query(
		`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = CURRENT_SCHEMA()
				AND table_name = $1
		`,
		[tableName]
	);

	return result.rows.map((row) => row.column_name);
};

const getFirstAvailableColumn = (columns, candidateColumns) => {
	return candidateColumns.find((columnName) => columns.includes(columnName)) || null;
};

const findFarmerById = async (farmerId) => {
	const farmerSourceTables = [
		{
			tableName: "farmers",
			idColumns: ["farmer_id", "id"],
		},
		{
			tableName: "farmer_profiles",
			idColumns: ["farmer_id", "profile_id", "id"],
		},
	];

	for (const { tableName, idColumns } of farmerSourceTables) {
		if (!(await tableExists(tableName))) {
			continue;
		}

		const farmerColumns = await getTableColumns(tableName);
		const farmerIdColumn = getFirstAvailableColumn(farmerColumns, idColumns);

		if (!farmerIdColumn) {
			continue;
		}

		const farmerResult = await pool.query(
			`
				SELECT ${farmerIdColumn} AS id
				FROM ${tableName}
				WHERE ${farmerIdColumn} = $1
			`,
			[farmerId]
		);

		if (farmerResult.rows[0]) {
			return farmerResult.rows[0];
		}
	}

	const userColumns = await getTableColumns("users");
	const userIdColumn = getFirstAvailableColumn(userColumns, ["user_id", "id"]);

	if (!userIdColumn) {
		return null;
	}

	if (userColumns.includes("role_id") && (await tableExists("roles"))) {
		const roleBasedUserResult = await pool.query(
			`
				SELECT u.${userIdColumn} AS id
				FROM users u
				JOIN roles r ON r.role_id = u.role_id
				WHERE u.${userIdColumn} = $1
					AND LOWER(COALESCE(r.role_name, '')) = 'farmer'
			`,
			[farmerId]
		);

		if (roleBasedUserResult.rows[0]) {
			return roleBasedUserResult.rows[0];
		}
	}

	return null;
};

const findProductOwnershipById = async (productId) => {
	const result = await pool.query("SELECT id, farmer_id FROM products WHERE id = $1", [productId]);
	return result.rows[0] || null;
};

const findProductStockById = async (productId) => {
	const result = await pool.query(
		`
			SELECT p.id, p.farmer_id, p.stock
			FROM products p
			WHERE p.id = $1
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const findProductStockForUpdateById = async (client, productId) => {
	const result = await client.query(
		`
			SELECT p.id, p.farmer_id, p.stock
			FROM products p
			WHERE p.id = $1
			FOR UPDATE
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const findAllProducts = async () => {
	const result = await pool.query(
		`
			${productSelect}
			ORDER BY p.created_at DESC
		`
	);

	return result.rows;
};

const findProductById = async (productId) => {
	const result = await pool.query(
		`
			${productSelect}
			WHERE p.id = $1
		`,
		[productId]
	);

	return result.rows[0] || null;
};

const updateProductById = async (
	productId,
	{ name, description, price, category_id, farm_location, image_url }
) => {
	const result = await pool.query(
		`
			UPDATE products
			SET
				name = COALESCE($1, name),
				description = COALESCE($2, description),
				price = COALESCE($3, price),
				category_id = COALESCE($4, category_id),
				farm_location = COALESCE($5, farm_location),
				image_url = COALESCE($6, image_url)
			WHERE id = $7
			RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
		`,
		[name, description, price, category_id, farm_location, image_url, productId]
	);

	return result.rows[0] || null;
};

const updateProductStockById = async (productId, stock) => {
	await pool.query(
		`
			UPDATE products
			SET stock = $1
			WHERE id = $2
		`,
		[stock, productId]
	);

	return findProductById(productId);
};

const deleteProductById = async (productId) => {
	const result = await pool.query(
		`
			DELETE FROM products
			WHERE id = $1
			RETURNING id
		`,
		[productId]
	);

	return result.rows[0] || null;
};

module.exports = {
	createProduct,
	deleteProductById,
	findAllProducts,
	findFarmerById,
	findProductById,
	findProductOwnershipById,
	findProductStockById,
	findProductStockForUpdateById,
	updateProductById,
	updateProductStockById,
};
