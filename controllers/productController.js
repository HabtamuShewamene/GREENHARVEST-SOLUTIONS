const { pool } = require("../config/db");

const isValidPositiveNumber = (value) => {
  return !Number.isNaN(Number(value)) && Number(value) >= 0;
};

const ensureFarmerRole = (req, res) => {
  if (req.user.role !== "farmer") {
    res.status(403).json({
      message: "Only farmers can perform this action",
    });
    return false;
  }

  return true;
};

const getProductOwnership = async (productId) => {
  const result = await pool.query(
    "SELECT id, farmer_id FROM products WHERE id = $1",
    [productId]
  );

  return result.rows[0] || null;
};

const createProduct = async (req, res) => {
  try {
    if (!ensureFarmerRole(req, res)) {
      return;
    }

    const {
      name,
      description,
      price,
      stock,
      category_id,
      farm_location,
      image_url,
    } = req.body;

    if (!name || !isValidPositiveNumber(price) || !Number.isInteger(Number(stock))) {
      return res.status(400).json({
        message: "Name, valid price, and integer stock are required",
      });
    }

    const categoryId = category_id ? Number(category_id) : null;

    if (category_id && !Number.isInteger(categoryId)) {
      return res.status(400).json({
        message: "category_id must be an integer",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO products (
          farmer_id,
          category_id,
          name,
          description,
          price,
          stock,
          farm_location,
          image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
      `,
      [
        req.user.id,
        categoryId,
        name.trim(),
        description ? description.trim() : null,
        Number(price),
        Number(stock),
        farm_location ? farm_location.trim() : null,
        image_url ? image_url.trim() : null,
      ]
    );

    return res.status(201).json({
      message: "Product created successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Create product failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    if (!ensureFarmerRole(req, res)) {
      return;
    }

    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const ownedProduct = await getProductOwnership(productId);

    if (!ownedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (ownedProduct.farmer_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own products",
      });
    }

    const {
      name,
      description,
      price,
      stock,
      category_id,
      farm_location,
      image_url,
    } = req.body;

    if (
      price !== undefined &&
      !isValidPositiveNumber(price)
    ) {
      return res.status(400).json({
        message: "price must be a valid non-negative number",
      });
    }

    if (
      stock !== undefined &&
      !Number.isInteger(Number(stock))
    ) {
      return res.status(400).json({
        message: "stock must be an integer",
      });
    }

    if (
      category_id !== undefined &&
      category_id !== null &&
      !Number.isInteger(Number(category_id))
    ) {
      return res.status(400).json({
        message: "category_id must be an integer",
      });
    }

    const result = await pool.query(
      `
        UPDATE products
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          stock = COALESCE($4, stock),
          category_id = COALESCE($5, category_id),
          farm_location = COALESCE($6, farm_location),
          image_url = COALESCE($7, image_url)
        WHERE id = $8
        RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
      `,
      [
        name !== undefined ? name.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : null,
        price !== undefined ? Number(price) : null,
        stock !== undefined ? Number(stock) : null,
        category_id !== undefined ? category_id : null,
        farm_location !== undefined ? (farm_location ? farm_location.trim() : null) : null,
        image_url !== undefined ? (image_url ? image_url.trim() : null) : null,
        productId,
      ]
    );

    return res.status(200).json({
      message: "Product updated successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Update product failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    if (!ensureFarmerRole(req, res)) {
      return;
    }

    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const ownedProduct = await getProductOwnership(productId);

    if (!ownedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (ownedProduct.farmer_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only delete your own products",
      });
    }

    await pool.query("DELETE FROM products WHERE id = $1", [productId]);

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `
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
        ORDER BY p.created_at DESC
      `
    );

    return res.status(200).json({
      products: result.rows,
    });
  } catch (error) {
    console.error("Fetch products failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const result = await pool.query(
      `
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
        WHERE p.id = $1
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Fetch product failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProductStock = async (req, res) => {
  try {
    if (!ensureFarmerRole(req, res)) {
      return;
    }

    const productId = Number(req.params.id);
    const { stock } = req.body;

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({
        message: "stock must be a non-negative integer",
      });
    }

    const ownedProduct = await getProductOwnership(productId);

    if (!ownedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (ownedProduct.farmer_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only update stock for your own products",
      });
    }

    const result = await pool.query(
      `
        UPDATE products
        SET stock = $1
        WHERE id = $2
        RETURNING id, farmer_id, category_id, name, description, price, stock, farm_location, image_url, created_at
      `,
      [Number(stock), productId]
    );

    return res.status(200).json({
      message: "Stock updated successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Update stock failed:", error.message);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductStock,
};